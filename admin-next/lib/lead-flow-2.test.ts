import { expect, test } from "bun:test"

import {
  buildLeadFlow2Snapshot,
  extractFlow2TemplateRefs,
  FLOW2_TABLE_STEPS,
  getFlow2PipelineSteps,
  isFlow2StepComplete,
  outputFieldForFlow2Task,
} from "./lead-flow-2"
import { jobKindForTask } from "./job-kind"
import type { AiTask, SlimLead } from "./types"

const baseLead = (over: Partial<SlimLead> = {}): SlimLead => ({
  place_id: "lead-1",
  name: "Lead",
  rating: null,
  review_count: null,
  website: "https://example.com",
  business_status: null,
  lead_score: null,
  dynamic: {},
  has_screenshot: true,
  has_markdown: true,
  updated_at: "2026-01-01T00:00:00.000Z",
  ...over,
})

const baseTask = (over: Partial<AiTask> = {}): AiTask => ({
  name: "design_prompt",
  label: "Design brief",
  enabled: true,
  sort_order: 1,
  updated_at: "2026-01-01T00:00:00.000Z",
  task_type: "place",
  config: {
    output_field: "design_prompt",
    prompt_template: "Write for {{name}}",
  },
  ...over,
})

test("infers task output field from config and falls back to task name", () => {
  expect(outputFieldForFlow2Task(baseTask())).toBe("design_prompt")
  expect(
    outputFieldForFlow2Task(
      baseTask({ name: "fallback", config: { prompt_template: "x" } }),
    ),
  ).toBe("fallback")
})

test("extracts template dependencies and ignores runtime query placeholder", () => {
  const refs = extractFlow2TemplateRefs(
    baseTask({
      config: {
        prompt_template: "{{design_prompt}} {{ website }}",
        start_url_template: "https://example.com?q={{query}}",
      },
    }),
  )
  expect(refs).toEqual(["design_prompt", "website"])
})

test("classifies complete, ready, blocked, errored, and ineligible task leads", () => {
  const task = baseTask({
    config: {
      output_field: "design_prompt",
      send_screenshot: true,
      send_markdown: true,
    },
  })
  const snapshot = buildLeadFlow2Snapshot({
    leads: [
      baseLead({
        place_id: "complete",
        dynamic: { design_prompt: "brief" },
      }),
      baseLead({ place_id: "ready" }),
      baseLead({ place_id: "blocked", has_markdown: false }),
      baseLead({
        place_id: "errored",
        dynamic: { design_prompt_error: "failed" },
      }),
    ],
    tasks: [task],
  })

  const node = snapshot.nodes.find((n) => n.id === "task:design_prompt")
  expect(node?.counts.complete).toBe(1)
  expect(node?.counts.ready).toBe(1)
  expect(node?.counts.blocked).toBe(1)
  expect(node?.counts.errored).toBe(1)
  expect(node?.blockers[0]?.key).toBe("markdown")

  const disabled = buildLeadFlow2Snapshot({
    leads: [baseLead({ place_id: "disabled" })],
    tasks: [baseTask({ enabled: false })],
    includeDisabledTasks: true,
  }).nodes.find((n) => n.id === "task:design_prompt")
  expect(disabled?.counts.ineligible).toBe(1)
})

test("uses screenshot and markdown artifact readiness from slim flags", () => {
  const snapshot = buildLeadFlow2Snapshot({
    leads: [
      baseLead({ place_id: "done" }),
      baseLead({
        place_id: "needs-crawl",
        has_screenshot: false,
        has_markdown: false,
      }),
      baseLead({
        place_id: "needs-markdown",
        has_screenshot: true,
        has_markdown: false,
      }),
      baseLead({
        place_id: "no-website",
        website: null,
        has_screenshot: false,
        has_markdown: false,
      }),
    ],
    tasks: [],
  })

  expect(snapshot.nodes.find((n) => n.id === "artifact:crawl")?.counts.ready).toBe(1)
  expect(snapshot.nodes.find((n) => n.id === "artifact:markdown")?.counts.ready).toBe(1)
  expect(
    snapshot.nodes.find((n) => n.id === "branch:no-website")?.counts.complete,
  ).toBe(1)
  expect(
    snapshot.nodes.find((n) => n.id === "branch:needs-crawl")?.counts.complete,
  ).toBe(1)
  expect(
    snapshot.nodes.find((n) => n.id === "branch:needs-markdown")?.counts.complete,
  ).toBe(1)
})

test("classifies website contacts artifact states", () => {
  const snapshot = buildLeadFlow2Snapshot({
    leads: [
      baseLead({
        place_id: "contacts-done",
        has_contacts: true,
        dynamic: {
          website_contacts: {
            emails: ["a@b.dk"],
            phones: [],
            socials: {},
            extracted_at: "2026-01-01T00:00:00.000Z",
          },
        },
      }),
      baseLead({
        place_id: "needs-contacts",
        has_screenshot: true,
        has_contacts: false,
      }),
      baseLead({
        place_id: "contacts-blocked",
        has_screenshot: false,
        has_contacts: false,
      }),
    ],
    tasks: [],
  })

  const node = snapshot.nodes.find((n) => n.id === "artifact:contacts")
  expect(node?.counts.complete).toBe(1)
  expect(node?.counts.ready).toBe(1)
  expect(node?.counts.blocked).toBe(1)
  expect(node?.run?.kind).toBe("extract_contacts")
  expect(
    snapshot.edges.some((e) => e.id === "artifact:crawl:artifact:contacts"),
  ).toBe(true)
  expect(
    snapshot.nodes.find((n) => n.id === "branch:needs-contacts")?.counts.complete,
  ).toBe(1)
})

test("treats {{category}} as satisfied via the derived Places type", () => {
  const task = baseTask({
    name: "discard_score",
    label: "Discard score",
    config: {
      output_field: "discard_score",
      send_screenshot: false,
      send_markdown: false,
      meta_prompt: "Category: {{category}}",
    },
  })

  // discard_score also depends on visuel_rating — satisfy it so category is
  // the only variable under test.
  const rated = { visuel_rating: 5 }

  // primaryTypeDisplayName.text present → ready, not blocked.
  const fromDisplay = buildLeadFlow2Snapshot({
    leads: [
      baseLead({
        place_id: "has-display",
        dynamic: rated,
        data: { primaryTypeDisplayName: { text: "Restaurant" } },
      }),
    ],
    tasks: [task],
  }).nodes.find((n) => n.id === "task:discard_score")
  expect(fromDisplay?.counts.ready).toBe(1)
  expect(fromDisplay?.counts.blocked).toBe(0)

  // bare primaryType fallback → still ready.
  const fromPrimary = buildLeadFlow2Snapshot({
    leads: [
      baseLead({
        place_id: "has-type",
        dynamic: rated,
        data: { primaryType: "cafe" },
      }),
    ],
    tasks: [task],
  }).nodes.find((n) => n.id === "task:discard_score")
  expect(fromPrimary?.counts.ready).toBe(1)

  // no Places type at all → genuinely blocked on category.
  const missing = buildLeadFlow2Snapshot({
    leads: [baseLead({ place_id: "no-type", dynamic: rated, data: {} })],
    tasks: [task],
  }).nodes.find((n) => n.id === "task:discard_score")
  expect(missing?.counts.blocked).toBe(1)
  expect(missing?.blockers.some((b) => b.key === "category")).toBe(true)
})

test("discard gate classifies leads and gates downstream creative tasks", () => {
  const discardTask = baseTask({
    name: "discard_score",
    label: "Discard score",
    config: { output_field: "discard_score", discard_at: 8, send_screenshot: false, send_markdown: false },
  })
  const overview = baseTask({
    name: "website_overview",
    label: "Website overview",
    config: { output_field: "website_overview", send_screenshot: false, send_markdown: false },
  })
  const designPrompt = baseTask({
    name: "design_prompt",
    label: "Design brief",
    config: { output_field: "design_prompt", send_screenshot: false, send_markdown: false },
  })
  const variant = baseTask({
    name: "variant_design",
    label: "Variant",
    task_type: "browser_agent",
    config: { output_field: "variant_design" },
  })

  const snapshot = buildLeadFlow2Snapshot({
    leads: [
      baseLead({ place_id: "unscored" }),
      // discard_score is stored as a structured { score, reason } object.
      baseLead({ place_id: "discarded", dynamic: { discard_score: { score: 8, reason: "x" } } }),
      baseLead({ place_id: "kept", dynamic: { discard_score: { score: 5, reason: "y" } } }),
    ],
    tasks: [discardTask, overview, designPrompt, variant],
  })

  const gate = snapshot.nodes.find((n) => n.id === "gate:discard")
  expect(gate?.counts.blocked).toBe(1) // unscored
  expect(gate?.counts.ineligible).toBe(1) // discarded (>= 8)
  expect(gate?.counts.complete).toBe(1) // kept (< 8)

  // Separate dead-end branch lists the discarded leads as "done" (a successful
  // terminal bucket, like no-website). They read n/a only on downstream tasks.
  const discarded = snapshot.nodes.find((n) => n.id === "branch:discarded")
  expect(discarded?.kind).toBe("branch")
  expect(discarded?.counts.complete).toBe(1)
  expect(discarded?.leadIdsByState.complete).toContain("discarded")
  expect(
    snapshot.edges.some(
      (e) => e.from === "gate:discard" && e.to === "branch:discarded",
    ),
  ).toBe(true)

  const ov = snapshot.nodes.find((n) => n.id === "task:website_overview")
  expect(ov?.leadIdsByState.blocked).toContain("unscored")
  expect(ov?.leadIdsByState.ineligible).toContain("discarded")
  expect(ov?.leadIdsByState.ready).toContain("kept")

  // discarded propagates through the design_prompt-dependent tail.
  const vr = snapshot.nodes.find((n) => n.id === "task:variant_design")
  expect(vr?.leadIdsByState.ineligible).toContain("discarded")
})

test("discard gate marks never-scoreable leads as n/a, not blocked", () => {
  // A no-website lead can never get a visuel_rating → never a discard_score.
  // At the gate it must be ineligible (n/a), not blocked (which would imply a
  // pending job that could still run).
  const rating = baseTask({
    name: "visuel_rating",
    label: "Visuel rating",
    config: { output_field: "visuel_rating", send_screenshot: true, send_markdown: true },
  })
  const discardTask = baseTask({
    name: "discard_score",
    label: "Discard score",
    config: { output_field: "discard_score", discard_at: 8, send_screenshot: false, send_markdown: false },
  })
  const snapshot = buildLeadFlow2Snapshot({
    leads: [
      baseLead({ place_id: "no-website", website: null, has_screenshot: false, has_markdown: false }),
      baseLead({ place_id: "pending" }), // scoreable, just not scored yet
    ],
    tasks: [rating, discardTask],
  })
  const gate = snapshot.nodes.find((n) => n.id === "gate:discard")
  expect(gate?.leadIdsByState.ineligible).toContain("no-website")
  expect(gate?.leadIdsByState.blocked).toContain("pending")
})

test("discard gate is shown but inert (passes everyone) when no threshold is set", () => {
  const discardTask = baseTask({
    name: "discard_score",
    label: "Discard score",
    config: { output_field: "discard_score", send_screenshot: false, send_markdown: false },
  })
  const overview = baseTask({
    name: "website_overview",
    label: "Website overview",
    config: { output_field: "website_overview", send_screenshot: false, send_markdown: false },
  })
  const snapshot = buildLeadFlow2Snapshot({
    leads: [baseLead({ place_id: "unscored" })],
    tasks: [discardTask, overview],
  })
  // Gate node is visible (so it can be configured) and connected to the task...
  const gate = snapshot.nodes.find((n) => n.id === "gate:discard")
  expect(gate).toBeDefined()
  expect(gate?.counts.ineligible).toBe(0)
  const ov = snapshot.nodes.find((n) => n.id === "task:website_overview")
  expect(ov?.dependencies).toContain("discard_pass")
  // ...but with no threshold it passes everyone, so an unscored lead is ready.
  expect(ov?.leadIdsByState.ready).toContain("unscored")
})

test("does not show the discard gate when there is no discard_score task", () => {
  const overview = baseTask({
    name: "website_overview",
    label: "Website overview",
    config: { output_field: "website_overview", send_screenshot: false, send_markdown: false },
  })
  const snapshot = buildLeadFlow2Snapshot({
    leads: [baseLead({ place_id: "any" })],
    tasks: [overview],
  })
  expect(snapshot.nodes.some((n) => n.id === "gate:discard")).toBe(false)
  const ov = snapshot.nodes.find((n) => n.id === "task:website_overview")
  expect(ov?.dependencies).not.toContain("discard_pass")
  expect(ov?.leadIdsByState.ready).toContain("any")
})

test("maps generate_inspiration_queries to its dedicated job kind", () => {
  const task = baseTask({
    name: "generate_inspiration_queries",
    label: "Inspiration queries",
    config: { output_field: "inspiration_queries" },
  })
  expect(jobKindForTask(task)).toBe("generate_inspiration_queries")
  const snapshot = buildLeadFlow2Snapshot({
    leads: [baseLead({ dynamic: { design_prompt: "brief" } })],
    tasks: [task],
  })
  const node = snapshot.nodes.find(
    (n) => n.id === "task:generate_inspiration_queries",
  )
  expect(node?.jobKind).toBe("generate_inspiration_queries")
  expect(node?.counts.ready).toBe(1)
})

test("creates dynamic nodes and edges for newly added tasks", () => {
  const snapshot = buildLeadFlow2Snapshot({
    leads: [baseLead({ dynamic: { design_prompt: "brief" } })],
    tasks: [
      baseTask(),
      baseTask({
        name: "new_followup",
        label: "New followup",
        sort_order: 2,
        config: {
          output_field: "new_followup",
          prompt_template: "Use {{design_prompt}}",
          send_screenshot: false,
          send_markdown: false,
        },
      }),
    ],
  })

  expect(snapshot.nodes.some((n) => n.id === "task:new_followup")).toBe(true)
  expect(
    snapshot.edges.some(
      (e) => e.from === "task:design_prompt" && e.to === "task:new_followup",
    ),
  ).toBe(true)
})

test("extracts dependencies from included_context", () => {
  const snapshot = buildLeadFlow2Snapshot({
    leads: [baseLead({ place_id: "blocked" })],
    tasks: [
      baseTask({
        name: "needs_context",
        label: "Needs context",
        config: {
          output_field: "needs_context",
          included_context: ["visuel_rating"],
          send_screenshot: false,
          send_markdown: false,
        },
      }),
    ],
  })
  const node = snapshot.nodes.find((n) => n.id === "task:needs_context")
  expect(node?.dependencies).toContain("visuel_rating")
  // visuel_rating is absent on the lead → blocked on that input.
  expect(node?.counts.blocked).toBe(1)
  expect(node?.blockers[0]?.key).toBe("visuel_rating")
})

test("blocks downstream task when an upstream task output is missing", () => {
  const snapshot = buildLeadFlow2Snapshot({
    // design_prompt absent → find_inspiration cannot run yet.
    leads: [baseLead({ dynamic: { inspiration_queries: ["a"] } })],
    tasks: [
      baseTask(),
      baseTask({
        name: "find_inspiration",
        label: "Find inspiration",
        task_type: "browser_agent",
        config: { output_field: "found_inspiration" },
      }),
    ],
  })
  const node = snapshot.nodes.find((n) => n.id === "task:find_inspiration")
  expect(node?.counts.blocked).toBe(1)
  expect(node?.blockers.some((b) => b.key === "design_prompt")).toBe(true)
})

test("propagates ineligible (n/a) instead of blocked when an input can never be produced", () => {
  const snapshot = buildLeadFlow2Snapshot({
    leads: [
      // No website → can't crawl → no screenshot. A task needing the
      // screenshot should treat this lead as n/a, not blocked.
      baseLead({
        place_id: "no-website",
        website: null,
        has_screenshot: false,
        has_markdown: false,
      }),
      // Has website but not yet crawled → genuinely blocked, can become ready.
      baseLead({
        place_id: "uncrawled",
        has_screenshot: false,
        has_markdown: false,
      }),
    ],
    tasks: [
      baseTask({
        config: { output_field: "design_prompt", send_markdown: true },
      }),
    ],
  })

  const node = snapshot.nodes.find((n) => n.id === "task:design_prompt")
  expect(node?.counts.ineligible).toBe(1)
  expect(node?.counts.blocked).toBe(1)
  expect(node?.leadIdsByState.ineligible).toContain("no-website")
  expect(node?.leadIdsByState.blocked).toContain("uncrawled")
})

test("adds recommended subpage dependency for relevant tasks", () => {
  const snapshot = buildLeadFlow2Snapshot({
    leads: [baseLead()],
    tasks: [
      baseTask({
        name: "ai_subpages",
        label: "AI subpages",
        config: { output_field: "ai_subpages" },
      }),
      baseTask({
        name: "website_overview",
        label: "Website overview",
        config: {
          output_field: "website_overview",
          subpage_markdown_mode: "recommended",
          recommended_subpages_field: "ai_subpages",
        },
      }),
    ],
  })

  const overview = snapshot.nodes.find((n) => n.id === "task:website_overview")
  expect(overview?.dependencies).toContain("ai_subpages")
  expect(overview?.counts.blocked).toBe(1)
})

test("FLOW2_TABLE_STEPS follows lane order with contacts after markdown", () => {
  const ids = FLOW2_TABLE_STEPS.map((s) => s.id)
  expect(ids[0]).toBe("artifact:website")
  expect(ids.indexOf("artifact:markdown")).toBe(2)
  expect(ids.indexOf("artifact:contacts")).toBe(3)
  expect(ids.at(-1)).toBe("task:variant_design")
  expect(ids).not.toContain("source")
})

test("isFlow2StepComplete checks artifacts and tasks", () => {
  const tasks: AiTask[] = [
    baseTask({
      name: "discard_score",
      config: { output_field: "discard_score", discard_at: 7 },
    }),
  ]
  const steps = getFlow2PipelineSteps(tasks)
  const ctx = { tasks, steps }
  const lead = baseLead({
    dynamic: {
      visuel_rating: 5,
      discard_score: { score: 3, reason: "ok" },
      design_prompt: "brief",
    },
  })

  expect(isFlow2StepComplete(lead, "artifact:website", ctx)).toBe(true)
  expect(isFlow2StepComplete(lead, "artifact:crawl", ctx)).toBe(true)
  expect(isFlow2StepComplete(lead, "task:visuel_rating", ctx)).toBe(true)
  expect(isFlow2StepComplete(lead, "task:discard_score", ctx)).toBe(true)
  expect(isFlow2StepComplete(lead, "gate:discard", ctx)).toBe(true)
  expect(isFlow2StepComplete(lead, "task:design_prompt", ctx)).toBe(true)
  expect(isFlow2StepComplete(lead, "task:variant_design", ctx)).toBe(false)
})

test("isFlow2StepComplete accepts visual_rating fallback", () => {
  const ctx = { tasks: [], steps: getFlow2PipelineSteps([]) }
  const lead = baseLead({ dynamic: { visual_rating: 8 } })
  expect(isFlow2StepComplete(lead, "task:visuel_rating", ctx)).toBe(true)
})

test("isFlow2StepComplete gate fails when score at or above threshold", () => {
  const tasks: AiTask[] = [
    baseTask({
      name: "discard_score",
      config: { output_field: "discard_score", discard_at: 5 },
    }),
  ]
  const ctx = { tasks, steps: getFlow2PipelineSteps(tasks) }
  const kept = baseLead({
    dynamic: { discard_score: { score: 3, reason: "keep" } },
  })
  const discarded = baseLead({
    dynamic: { discard_score: { score: 8, reason: "drop" } },
  })
  const unscored = baseLead({ dynamic: {} })

  expect(isFlow2StepComplete(kept, "gate:discard", ctx)).toBe(true)
  expect(isFlow2StepComplete(discarded, "gate:discard", ctx)).toBe(false)
  expect(isFlow2StepComplete(unscored, "gate:discard", ctx)).toBe(false)
})

test("isFlow2StepComplete gate passes everyone when threshold unset", () => {
  const ctx = { tasks: [], steps: getFlow2PipelineSteps([]) }
  expect(
    isFlow2StepComplete(
      baseLead({ dynamic: { discard_score: { score: 9, reason: "x" } } }),
      "gate:discard",
      ctx,
    ),
  ).toBe(true)
})
