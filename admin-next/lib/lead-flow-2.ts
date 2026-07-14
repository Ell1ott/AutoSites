import { readField } from "@/lib/filter"
import { readDiscardScore } from "@/lib/discard-score"
import { jobKindForTask } from "@/lib/job-kind"
import { hasContacts as leadHasContacts } from "@/lib/website-contacts"
import { clausesToParams } from "@/lib/url"
import type {
  AiTask,
  FieldDescriptor,
  FilterClause,
  Job,
  JobKind,
  SlimLead,
} from "@/lib/types"

export type Flow2LeadState =
  | "complete"
  | "ready"
  | "blocked"
  | "errored"
  | "ineligible"

export type Flow2NodeKind = "source" | "artifact" | "task" | "branch"

export type Flow2EdgeBranchType = "main" | "missing" | "error" | "dependency"

export type Flow2Counts = Record<Flow2LeadState, number> & {
  total: number
}

export type Flow2Blocker = {
  key: string
  label: string
  count: number
  leadIds: string[]
}

export type Flow2RunConfig = {
  kind: JobKind
  taskName?: string
  supportsWorkers: boolean
  supportsForce: boolean
}

export type Flow2Node = {
  id: string
  label: string
  kind: Flow2NodeKind
  lane: number
  taskName?: string
  outputField?: string
  jobKind?: JobKind
  enabled: boolean
  dependencies: string[]
  counts: Flow2Counts
  leadIdsByState: Record<Flow2LeadState, string[]>
  readyLeadIds: string[]
  rerunnableLeadIds: string[]
  blockers: Flow2Blocker[]
  links: Partial<Record<Flow2LeadState, string>>
  run?: Flow2RunConfig
  activeJobIds: string[]
}

export type Flow2Edge = {
  id: string
  from: string
  to: string
  label: string
  reason: string
  branchType: Flow2EdgeBranchType
}

export type Flow2Bottleneck = {
  nodeId: string
  label: string
  count: number
  state: Flow2LeadState
}

export type Flow2Snapshot = {
  totalLeads: number
  loadedLeads: number
  leads: SlimLead[]
  nodes: Flow2Node[]
  edges: Flow2Edge[]
  warnings: string[]
  biggestBottlenecks: Flow2Bottleneck[]
}

export type BuildLeadFlow2Input = {
  leads: SlimLead[]
  tasks: AiTask[]
  fields?: FieldDescriptor[]
  jobs?: Job[]
  totalLeads?: number
  includeDisabledTasks?: boolean
}

type DerivedTask = {
  task: AiTask
  outputField: string
  dependencies: string[]
  jobKind: JobKind
}

const STATE_KEYS: Flow2LeadState[] = [
  "complete",
  "ready",
  "blocked",
  "errored",
  "ineligible",
]

const ARTIFACT_PRODUCERS = new Map<string, string>([
  ["website", "artifact:website"],
  ["screenshot", "artifact:crawl"],
  ["has_screenshot", "artifact:crawl"],
  ["markdown", "artifact:markdown"],
  ["has_markdown", "artifact:markdown"],
  ["website_contacts", "artifact:contacts"],
  ["has_contacts", "artifact:contacts"],
  // Synthetic "passed the discard gate" signal — produced by the gate:discard
  // node (only when a discard threshold is configured), consumed by the
  // creative tasks below. Discarded leads are ineligible at the gate and that
  // verdict propagates downstream like the no-website branch.
  ["discard_pass", "gate:discard"],
])

const NON_FIELD_TEMPLATE_REFS = new Set(["query"])

/** Synthetic dependency key produced by the discard gate. */
const DISCARD_PASS = "discard_pass"

const EXTRA_TASK_DEPENDENCIES: Record<string, string[]> = {
  discard_score: ["visuel_rating"],
  // Creative work only continues for leads that have been scored AND pass the
  // discard threshold. The inspiration/variant tail already depends on
  // design_prompt, so it inherits the gate verdict by propagation.
  ai_subpages: [DISCARD_PASS],
  website_overview: [DISCARD_PASS],
  products: [DISCARD_PASS],
  design_prompt: [DISCARD_PASS],
  desgin_search_queries: [DISCARD_PASS],
  generate_inspiration_queries: ["design_prompt"],
  find_inspiration: ["design_prompt", "inspiration_queries"],
  variant_design: ["design_prompt"],
}

/**
 * Explicit canonical left→right pipeline order. Every node listed here gets its
 * own dedicated column (lane = index). This is a deliberate, human-curated
 * sequence — dependency inference alone clusters everything that only needs
 * markdown into one column, which reads as "a bunch of steps next to each
 * other with no clear next step". Nodes NOT in this list (new/unusual tasks)
 * fall back to a dependency-derived lane placed just after their producer, so
 * they still slot in sensibly without a code change.
 *
 * Branch (dead-end / optional) nodes are intentionally absent — they share
 * their source artifact's lane and stack vertically beneath it.
 */
const FLOW2_LANE_ORDER: string[] = [
  "source",
  "artifact:website",
  "artifact:crawl",
  "artifact:markdown",
  "task:visuel_rating",
  "task:discard_score",
  "gate:discard",
  "task:ai_subpages",
  "task:website_overview",
  "task:products",
  "task:design_prompt",
  "task:desgin_search_queries",
  "task:generate_inspiration_queries",
  "task:find_inspiration",
  "task:variant_design",
]

const EXPLICIT_LANE = new Map<string, number>(
  FLOW2_LANE_ORDER.map((id, index) => [id, index]),
)

/** Artifact node id → its lane, derived from the explicit order. */
const ARTIFACT_LANE = new Map<string, number>([
  ["artifact:website", EXPLICIT_LANE.get("artifact:website") ?? 1],
  ["artifact:crawl", EXPLICIT_LANE.get("artifact:crawl") ?? 2],
  ["artifact:markdown", EXPLICIT_LANE.get("artifact:markdown") ?? 3],
  ["artifact:contacts", EXPLICIT_LANE.get("artifact:markdown") ?? 3],
])

const FIRST_TASK_LANE = ARTIFACT_LANE.get("artifact:markdown")! + 1

function blankBuckets(): Record<Flow2LeadState, string[]> {
  return {
    complete: [],
    ready: [],
    blocked: [],
    errored: [],
    ineligible: [],
  }
}

function countsFromBuckets(
  buckets: Record<Flow2LeadState, string[]>,
): Flow2Counts {
  return {
    total: STATE_KEYS.reduce((sum, state) => sum + buckets[state].length, 0),
    complete: buckets.complete.length,
    ready: buckets.ready.length,
    blocked: buckets.blocked.length,
    errored: buckets.errored.length,
    ineligible: buckets.ineligible.length,
  }
}

function valueExists(v: unknown): boolean {
  if (v === undefined || v === null) return false
  if (typeof v === "string") return v.trim().length > 0
  return true
}

function unique(xs: string[]): string[] {
  return Array.from(new Set(xs.filter(Boolean)))
}

function toStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.filter((x): x is string => typeof x === "string")
}

function hasWebsite(lead: SlimLead): boolean {
  return valueExists(lead.website)
}

/**
 * The lead has a website URL, but a crawl proved it doesn't work — the domain
 * doesn't resolve (`no_website`) or the page failed to load (`broken_website`).
 * These are set by the crawl job (backend/jobs/crawl_sites.py). Such leads must
 * not be offered as "ready to crawl"; retrying a dead domain never succeeds.
 */
function websiteBroken(lead: SlimLead): boolean {
  const dyn = lead.dynamic ?? {}
  return dyn.no_website === true || dyn.broken_website === true
}

function hasScreenshot(lead: SlimLead): boolean {
  return lead.has_screenshot === true
}

function hasMarkdown(lead: SlimLead): boolean {
  return lead.has_markdown === true
}

/**
 * `category` is a *derived* template variable, never stored as its own field.
 * The backend's `build_namespace` (ai/prompt.py) computes it from the raw
 * Google Places blob as `data.primaryTypeDisplayName.text` falling back to
 * `data.primaryType`. We mirror that here so the flow graph doesn't flag every
 * lead as "blocked → needs a category" when the value is actually available.
 */
function leadCategory(lead: SlimLead): string {
  const raw = (lead.data ?? {}) as Record<string, unknown>
  const display = raw.primaryTypeDisplayName
  if (display && typeof display === "object") {
    const text = (display as Record<string, unknown>).text
    if (typeof text === "string" && text.trim()) return text
  }
  return typeof raw.primaryType === "string" ? raw.primaryType : ""
}

function outputExists(lead: SlimLead, key: string): boolean {
  if (key === "website") return hasWebsite(lead)
  if (key === "screenshot" || key === "has_screenshot") {
    return hasScreenshot(lead)
  }
  if (key === "markdown" || key === "has_markdown") return hasMarkdown(lead)
  if (key === "website_contacts" || key === "has_contacts") {
    return leadHasContacts(lead)
  }
  if (key === "category") return valueExists(leadCategory(lead))
  return valueExists(readField(lead, key))
}

function errorExists(lead: SlimLead, outputField: string): boolean {
  return valueExists(readField(lead, `dynamic.${outputField}_error`))
}

/**
 * Reads the configured discard threshold off the `discard_score` task. A lead
 * scoring at or above this value is discarded. Returns null when unset (or the
 * task is absent), in which case the discard gate is inactive entirely.
 */
function discardThreshold(tasks: AiTask[]): number | null {
  const task = tasks.find((t) => t.name === "discard_score")
  const v = task?.config?.discard_at
  return typeof v === "number" && Number.isFinite(v) ? v : null
}

function fieldFilterKey(key: string): string {
  if (key === "website") return key
  if (key.startsWith("dynamic.") || key.startsWith("data.")) return key
  return `dynamic.${key}`
}

function leadsHref(filters: FilterClause[]): string {
  const params = clausesToParams(filters)
  const query = params.toString()
  return query ? `/leads?${query}` : "/leads"
}

function labelForDependency(key: string, fieldsByKey: Map<string, FieldDescriptor>): string {
  if (key === "website") return "Website"
  if (key === "screenshot" || key === "has_screenshot") return "Screenshot"
  if (key === "markdown" || key === "has_markdown") return "Markdown"
  if (key === "website_contacts" || key === "has_contacts") {
    return "Website contacts"
  }
  if (key === DISCARD_PASS) return "Discard score"
  const field = fieldsByKey.get(key) ?? fieldsByKey.get(`dynamic.${key}`)
  if (field?.display) return field.display
  return key.replace(/^dynamic\./, "").replaceAll("_", " ")
}

export function outputFieldForFlow2Task(task: AiTask): string {
  const configured = task.config.output_field
  return typeof configured === "string" && configured.trim()
    ? configured.trim()
    : task.name
}

export function extractFlow2TemplateRefs(task: AiTask): string[] {
  const refs: string[] = []
  const sources = [
    task.config.meta_prompt,
    task.config.prompt_template,
    task.config.start_url_template,
    task.config.start_url,
  ]
  const pattern = /{{\s*([A-Za-z0-9_.-]+)\s*}}/g

  for (const source of sources) {
    if (typeof source !== "string") continue
    for (const match of source.matchAll(pattern)) {
      const key = match[1]
      if (!NON_FIELD_TEMPLATE_REFS.has(key)) refs.push(key)
    }
  }
  return unique(refs)
}

function taskDependencies(task: AiTask): string[] {
  const deps: string[] = []
  const config = task.config

  if (task.task_type === "place") {
    if (config.send_screenshot !== false) deps.push("screenshot")
    if (config.send_markdown !== false) deps.push("markdown")
  }

  deps.push(...toStringArray(config.included_context))
  deps.push(...extractFlow2TemplateRefs(task))

  if (config.subpage_markdown_mode === "recommended") {
    const recommended = config.recommended_subpages_field
    deps.push(typeof recommended === "string" ? recommended : "ai_subpages")
  }

  deps.push(...(EXTRA_TASK_DEPENDENCIES[task.name] ?? []))

  return unique(deps.filter((dep) => dep !== outputFieldForFlow2Task(task)))
}

function deriveTasks(
  tasks: AiTask[],
  includeDisabledTasks: boolean,
): DerivedTask[] {
  return tasks
    .filter((task) => includeDisabledTasks || task.enabled)
    .map((task) => ({
      task,
      outputField: outputFieldForFlow2Task(task),
      dependencies: taskDependencies(task),
      jobKind: jobKindForTask(task),
    }))
}

function activeJobsForNode(node: Flow2Node, jobs: Job[]): string[] {
  if (!node.jobKind) return []
  return jobs
    .filter((job) => {
      if (job.kind !== node.jobKind) return false
      if (!node.taskName) return true
      const taskArg = job.args?.task
      return taskArg === undefined || taskArg === node.taskName
    })
    .map((job) => job.id)
}

function buildBlockers(
  blockedLeadIds: string[],
  missingByLead: Map<string, string[]>,
  fieldsByKey: Map<string, FieldDescriptor>,
): Flow2Blocker[] {
  const byKey = new Map<string, string[]>()
  for (const id of blockedLeadIds) {
    for (const dep of missingByLead.get(id) ?? []) {
      const ids = byKey.get(dep) ?? []
      ids.push(id)
      byKey.set(dep, ids)
    }
  }
  return Array.from(byKey.entries())
    .map(([key, leadIds]) => ({
      key,
      label: labelForDependency(key, fieldsByKey),
      count: leadIds.length,
      leadIds,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

function artifactNode(
  id: string,
  label: string,
  leads: SlimLead[],
  classify: (lead: SlimLead) => Flow2LeadState,
  opts: {
    lane: number
    outputField?: string
    jobKind?: JobKind
    run?: Flow2RunConfig
    dependencies?: string[]
    links?: Partial<Record<Flow2LeadState, string>>
    rerunnableLeadIds?: string[]
  },
): Flow2Node {
  const buckets = blankBuckets()
  for (const lead of leads) {
    buckets[classify(lead)].push(lead.place_id)
  }
  return {
    id,
    label,
    kind: "artifact",
    lane: opts.lane,
    outputField: opts.outputField,
    jobKind: opts.jobKind,
    enabled: true,
    dependencies: opts.dependencies ?? [],
    counts: countsFromBuckets(buckets),
    leadIdsByState: buckets,
    readyLeadIds: buckets.ready,
    rerunnableLeadIds: opts.rerunnableLeadIds ?? [
      ...buckets.ready,
      ...buckets.complete,
    ],
    blockers: [],
    links: opts.links ?? {},
    run: opts.run,
    activeJobIds: [],
  }
}

function branchNode(
  id: string,
  label: string,
  lane: number,
  leadIds: string[],
  totalLeads: number,
): Flow2Node {
  const buckets = blankBuckets()
  buckets.complete = leadIds
  return {
    id,
    label,
    kind: "branch",
    lane,
    enabled: true,
    dependencies: [],
    counts: { ...countsFromBuckets(buckets), total: totalLeads },
    leadIdsByState: buckets,
    readyLeadIds: [],
    rerunnableLeadIds: [],
    blockers: [],
    links: {},
    activeJobIds: [],
  }
}

/**
 * Lane (horizontal column) for a task. Curated tasks use their explicit
 * position from {@link FLOW2_LANE_ORDER}; everything else is placed one column
 * to the right of its furthest-right producer (artifact or upstream task) so a
 * newly-added task slots in just after whatever it consumes.
 */
function taskLane(
  derived: DerivedTask,
  outputToTask: Map<string, DerivedTask>,
  memo: Map<string, number>,
  visiting: Set<string>,
): number {
  const explicit = EXPLICIT_LANE.get(`task:${derived.task.name}`)
  if (explicit !== undefined) return explicit

  if (memo.has(derived.task.name)) {
    return memo.get(derived.task.name) ?? FIRST_TASK_LANE
  }
  if (visiting.has(derived.task.name)) return FIRST_TASK_LANE
  visiting.add(derived.task.name)

  let lane = FIRST_TASK_LANE
  for (const dep of derived.dependencies) {
    const artifactProducer = ARTIFACT_PRODUCERS.get(dep)
    if (artifactProducer) {
      lane = Math.max(lane, (ARTIFACT_LANE.get(artifactProducer) ?? 0) + 1)
    }

    const producer = outputToTask.get(dep)
    if (producer) {
      lane = Math.max(
        lane,
        taskLane(producer, outputToTask, memo, visiting) + 1,
      )
    }
  }

  visiting.delete(derived.task.name)
  memo.set(derived.task.name, lane)
  return lane
}

function taskNode(
  derived: DerivedTask,
  lane: number,
  leads: SlimLead[],
  fieldsByKey: Map<string, FieldDescriptor>,
  outputProducer: Map<string, string>,
  stateByNode: Map<string, Map<string, Flow2LeadState>>,
  gate: { passed: (lead: SlimLead) => boolean } | null,
): Flow2Node {
  const buckets = blankBuckets()
  const missingByLead = new Map<string, string[]>()

  // The discard-gate signal is synthetic (no stored field). When no threshold
  // is configured the gate is inactive and the signal is always satisfied.
  const depSatisfied = (lead: SlimLead, dep: string): boolean =>
    dep === DISCARD_PASS
      ? (gate ? gate.passed(lead) : true)
      : outputExists(lead, dep)

  for (const lead of leads) {
    if (!derived.task.enabled) {
      buckets.ineligible.push(lead.place_id)
      continue
    }

    if (outputExists(lead, derived.outputField)) {
      buckets.complete.push(lead.place_id)
      continue
    }

    if (errorExists(lead, derived.outputField)) {
      buckets.errored.push(lead.place_id)
      continue
    }

    const missing = derived.dependencies.filter((dep) => !depSatisfied(lead, dep))
    if (missing.length === 0) {
      buckets.ready.push(lead.place_id)
      continue
    }

    // Distinguish "blocked" (an upstream step still needs to run, but could)
    // from "ineligible"/n-a (a missing input can never be produced for this
    // lead — e.g. it has no website, so screenshot/markdown/everything
    // downstream is permanently impossible). A missing dependency is
    // permanently impossible when its producer node already classified this
    // lead as ineligible; that verdict then propagates here and onward.
    const permanentlyImpossible = missing.some((dep) => {
      const producerId = outputProducer.get(dep)
      if (!producerId) return false
      return stateByNode.get(producerId)?.get(lead.place_id) === "ineligible"
    })

    if (permanentlyImpossible) {
      buckets.ineligible.push(lead.place_id)
    } else {
      buckets.blocked.push(lead.place_id)
      missingByLead.set(lead.place_id, missing)
    }
  }

  const outputKey = fieldFilterKey(derived.outputField)
  const errorKey = fieldFilterKey(`${derived.outputField}_error`)

  return {
    id: `task:${derived.task.name}`,
    label: derived.task.label || derived.task.name,
    kind: "task",
    lane,
    taskName: derived.task.name,
    outputField: derived.outputField,
    jobKind: derived.jobKind,
    enabled: derived.task.enabled,
    dependencies: derived.dependencies,
    counts: countsFromBuckets(buckets),
    leadIdsByState: buckets,
    readyLeadIds: buckets.ready,
    rerunnableLeadIds: [...buckets.ready, ...buckets.complete],
    blockers: buildBlockers(buckets.blocked, missingByLead, fieldsByKey),
    links: {
      complete: leadsHref([{ key: outputKey, op: "exists" }]),
      blocked: leadsHref([{ key: outputKey, op: "notexists" }]),
      errored: leadsHref([{ key: errorKey, op: "exists" }]),
    },
    run: {
      kind: derived.jobKind,
      taskName: derived.task.name,
      supportsWorkers:
        derived.task.task_type !== "browser_agent" &&
        derived.task.task_type !== "variant",
      supportsForce: true,
    },
    activeJobIds: [],
  }
}

/** Record a node's per-lead state so downstream consumers can read it. */
function recordNodeState(
  node: Flow2Node,
  stateByNode: Map<string, Map<string, Flow2LeadState>>,
): void {
  const map = new Map<string, Flow2LeadState>()
  for (const state of STATE_KEYS) {
    for (const id of node.leadIdsByState[state]) map.set(id, state)
  }
  stateByNode.set(node.id, map)
}

function fieldsByKey(fields: FieldDescriptor[] | undefined) {
  const map = new Map<string, FieldDescriptor>()
  for (const field of fields ?? []) {
    map.set(field.key, field)
    map.set(`${field.source}.${field.key}`, field)
  }
  return map
}

function buildEdges(
  derivedTasks: DerivedTask[],
  gateShown: boolean,
  gateActive: boolean,
): Flow2Edge[] {
  const edges: Flow2Edge[] = [
    {
      id: "source:artifact:website",
      from: "source",
      to: "artifact:website",
      label: "imported",
      reason: "Leads enter the flow from discovery/import.",
      branchType: "main",
    },
    {
      id: "artifact:website:artifact:crawl",
      from: "artifact:website",
      to: "artifact:crawl",
      label: "has website",
      reason: "A website is required before crawl can run.",
      branchType: "main",
    },
    {
      id: "artifact:website:branch:no-website",
      from: "artifact:website",
      to: "branch:no-website",
      label: "missing",
      reason: "Leads without a website cannot enter crawl.",
      branchType: "missing",
    },
    {
      id: "artifact:crawl:artifact:markdown",
      from: "artifact:crawl",
      to: "artifact:markdown",
      label: "screenshot",
      reason: "Markdown conversion follows crawl artifacts.",
      branchType: "main",
    },
    {
      id: "artifact:crawl:artifact:contacts",
      from: "artifact:crawl",
      to: "artifact:contacts",
      label: "screenshot",
      reason: "Contact extraction follows crawl artifacts.",
      branchType: "main",
    },
    {
      id: "artifact:crawl:branch:needs-crawl",
      from: "artifact:crawl",
      to: "branch:needs-crawl",
      label: "ready",
      reason: "These leads can be crawled now.",
      branchType: "missing",
    },
    {
      id: "artifact:markdown:branch:needs-markdown",
      from: "artifact:markdown",
      to: "branch:needs-markdown",
      label: "ready",
      reason: "These leads can be converted to markdown now.",
      branchType: "missing",
    },
    {
      id: "artifact:contacts:branch:needs-contacts",
      from: "artifact:contacts",
      to: "branch:needs-contacts",
      label: "ready",
      reason: "These leads can have contacts extracted now.",
      branchType: "missing",
    },
  ]

  const outputProducer = new Map<string, string>(ARTIFACT_PRODUCERS)
  for (const derived of derivedTasks) {
    outputProducer.set(derived.outputField, `task:${derived.task.name}`)
  }

  // The discard gate hangs off the discard_score task; its outgoing edges to the
  // creative tasks are drawn by the dependency loop below (they depend on
  // discard_pass, which the gate produces).
  if (gateShown) {
    edges.push({
      id: "task:discard_score:gate:discard",
      from: "task:discard_score",
      to: "gate:discard",
      label: "score",
      reason: "Leads are kept or discarded based on their discard score.",
      branchType: "main",
    })
  }
  // Dead-end branch for discarded leads (mirrors artifact:website → no-website).
  if (gateActive) {
    edges.push({
      id: "gate:discard:branch:discarded",
      from: "gate:discard",
      to: "branch:discarded",
      label: "discarded",
      reason: "Leads scoring at or above the threshold are discarded here.",
      branchType: "missing",
    })
  }

  for (const derived of derivedTasks) {
    const to = `task:${derived.task.name}`
    for (const dep of derived.dependencies) {
      const from = outputProducer.get(dep)
      if (!from || from === to) continue
      edges.push({
        id: `${from}:${to}:${dep}`,
        from,
        to,
        label: dep.replaceAll("_", " "),
        reason: `${derived.task.label || derived.task.name} needs ${dep}.`,
        branchType: "dependency",
      })
    }
  }

  const seen = new Set<string>()
  return edges.filter((edge) => {
    if (seen.has(edge.id)) return false
    seen.add(edge.id)
    return true
  })
}

export function buildLeadFlow2Snapshot({
  leads,
  tasks,
  fields,
  jobs = [],
  totalLeads,
  includeDisabledTasks = false,
}: BuildLeadFlow2Input): Flow2Snapshot {
  const loadedLeads = leads.length
  const reportedTotal = totalLeads ?? loadedLeads
  const fieldMap = fieldsByKey(fields)
  const threshold = discardThreshold(tasks)
  // The gate node is shown whenever a discard_score task exists, so it can be
  // discovered and configured. It only *enforces* discarding once a threshold
  // is set; until then it's an open pass-through.
  const gateShown = tasks.some(
    (t) => t.name === "discard_score" && (includeDisabledTasks || t.enabled),
  )
  const gateActive = gateShown && threshold !== null
  const derivedTasks = deriveTasks(tasks, includeDisabledTasks)
  // No discard_score task at all → strip the synthetic discard_pass dependency
  // so no dangling node/edge is implied.
  if (!gateShown) {
    for (const derived of derivedTasks) {
      derived.dependencies = derived.dependencies.filter((d) => d !== DISCARD_PASS)
    }
  }
  const outputToTask = new Map<string, DerivedTask>()
  for (const derived of derivedTasks) outputToTask.set(derived.outputField, derived)

  const laneMemo = new Map<string, number>()
  const nodes: Flow2Node[] = [
    {
      id: "source",
      label: "Fetched leads",
      kind: "source",
      lane: 0,
      enabled: true,
      dependencies: [],
      counts: {
        total: loadedLeads,
        complete: loadedLeads,
        ready: 0,
        blocked: 0,
        errored: 0,
        ineligible: 0,
      },
      leadIdsByState: {
        complete: leads.map((lead) => lead.place_id),
        ready: [],
        blocked: [],
        errored: [],
        ineligible: [],
      },
      readyLeadIds: [],
      rerunnableLeadIds: [],
      blockers: [],
      links: {},
      activeJobIds: [],
    },
    artifactNode(
      "artifact:website",
      "Has website",
      leads,
      (lead) => (hasWebsite(lead) ? "complete" : "ineligible"),
      {
        lane: 1,
        outputField: "website",
        links: {
          complete: leadsHref([{ key: "website", op: "exists" }]),
          ineligible: leadsHref([{ key: "website", op: "notexists" }]),
        },
      },
    ),
    artifactNode(
      "artifact:crawl",
      "Screenshot crawl",
      leads,
      (lead) => {
        if (hasScreenshot(lead)) return "complete"
        if (!hasWebsite(lead) || websiteBroken(lead)) return "ineligible"
        return "ready"
      },
      {
        lane: 2,
        outputField: "has_screenshot",
        jobKind: "crawl",
        dependencies: ["website"],
        run: {
          kind: "crawl",
          supportsWorkers: false,
          supportsForce: true,
        },
        links: {
          complete: leadsHref([{ key: "has_screenshot", op: "eq", value: true }]),
        },
        rerunnableLeadIds: leads
          .filter((lead) => hasWebsite(lead) && !websiteBroken(lead))
          .map((lead) => lead.place_id),
      },
    ),
    artifactNode(
      "artifact:markdown",
      "Markdown",
      leads,
      (lead) => {
        if (hasMarkdown(lead)) return "complete"
        if (!hasWebsite(lead) || websiteBroken(lead)) return "ineligible"
        if (!hasScreenshot(lead)) return "blocked"
        return "ready"
      },
      {
        lane: 3,
        outputField: "has_markdown",
        jobKind: "html_to_md",
        dependencies: ["screenshot"],
        run: {
          kind: "html_to_md",
          supportsWorkers: false,
          supportsForce: true,
        },
        links: {
          complete: leadsHref([{ key: "has_markdown", op: "eq", value: true }]),
        },
        rerunnableLeadIds: leads
          .filter((lead) => hasScreenshot(lead))
          .map((lead) => lead.place_id),
      },
    ),
    artifactNode(
      "artifact:contacts",
      "Website contacts",
      leads,
      (lead) => {
        if (leadHasContacts(lead)) return "complete"
        if (!hasWebsite(lead) || websiteBroken(lead)) return "ineligible"
        if (!hasScreenshot(lead)) return "blocked"
        return "ready"
      },
      {
        lane: ARTIFACT_LANE.get("artifact:contacts")!,
        outputField: "has_contacts",
        jobKind: "extract_contacts",
        dependencies: ["screenshot"],
        run: {
          kind: "extract_contacts",
          supportsWorkers: false,
          supportsForce: true,
        },
        links: {
          complete: leadsHref([
            { key: "dynamic.website_contacts", op: "exists" },
          ]),
        },
        rerunnableLeadIds: leads
          .filter((lead) => hasScreenshot(lead))
          .map((lead) => lead.place_id),
      },
    ),
    branchNode(
      "branch:no-website",
      "No website",
      ARTIFACT_LANE.get("artifact:website")!,
      leads.filter((lead) => !hasWebsite(lead)).map((lead) => lead.place_id),
      loadedLeads,
    ),
    branchNode(
      "branch:needs-crawl",
      "Needs crawl",
      ARTIFACT_LANE.get("artifact:crawl")!,
      leads
        .filter((lead) => hasWebsite(lead) && !hasScreenshot(lead) && !websiteBroken(lead))
        .map((lead) => lead.place_id),
      loadedLeads,
    ),
    branchNode(
      "branch:needs-markdown",
      "Needs markdown",
      ARTIFACT_LANE.get("artifact:markdown")!,
      leads
        .filter((lead) => hasScreenshot(lead) && !hasMarkdown(lead))
        .map((lead) => lead.place_id),
      loadedLeads,
    ),
    branchNode(
      "branch:needs-contacts",
      "Needs contacts",
      ARTIFACT_LANE.get("artifact:contacts")!,
      leads
        .filter((lead) => hasScreenshot(lead) && !leadHasContacts(lead))
        .map((lead) => lead.place_id),
      loadedLeads,
    ),
  ]

  // The discard gate is a computed stat node (like artifact:website): it scores
  // nothing itself but classifies leads by their discard_score so the creative
  // tasks downstream can depend on a "passed the gate" signal. Shown whenever a
  // discard_score task exists; only enforces discarding once a threshold is set
  // (until then it passes everyone, including unscored leads). The node itself
  // is built later, inside the lane-ordered loop, so it can read the
  // discard_score task's per-lead verdict (a lead that can never be scored —
  // e.g. no website — is n/a here, not blocked).
  const passedDiscard = (lead: SlimLead): boolean => {
    if (!gateActive) return true
    const s = readDiscardScore(lead)
    return s !== null && s < threshold!
  }
  const gate = gateShown ? { passed: passedDiscard } : null

  // Per-lead state for each producer node, so a downstream task can tell a
  // temporarily-blocked lead from one that's permanently ineligible (the n/a
  // verdict propagates from artifact nodes through the whole pipeline).
  const stateByNode = new Map<string, Map<string, Flow2LeadState>>()
  for (const node of nodes) recordNodeState(node, stateByNode)

  // dep key → producer node id (artifacts + task outputs), matching buildEdges.
  const outputProducer = new Map<string, string>(ARTIFACT_PRODUCERS)
  for (const derived of derivedTasks) {
    outputProducer.set(derived.outputField, `task:${derived.task.name}`)
  }

  // Process in lane order so a producer's state is recorded before its
  // consumers read it (taskLane guarantees producer lane < consumer lane).
  const orderedTasks = derivedTasks
    .map((derived) => ({
      derived,
      lane: taskLane(derived, outputToTask, laneMemo, new Set()),
    }))
    .sort((a, b) => a.lane - b.lane)

  const gateLane = EXPLICIT_LANE.get("gate:discard")!
  // Builds the gate node + its discarded dead-end branch. Called once
  // discard_score has been recorded so its ineligible verdict propagates here.
  const insertGateNodes = () => {
    const discardState = stateByNode.get("task:discard_score")
    const gateNode = artifactNode(
      "gate:discard",
      "Discard gate",
      leads,
      (lead) => {
        if (!gateActive) return "complete" // open until a threshold is set
        const s = readDiscardScore(lead)
        if (s !== null && s >= threshold!) return "ineligible" // discarded
        if (s === null) {
          // Unscored: n/a if it can never be scored (e.g. no website),
          // otherwise genuinely waiting on the discard_score job.
          return discardState?.get(lead.place_id) === "ineligible"
            ? "ineligible"
            : "blocked"
        }
        return "complete" // passed the gate, continues
      },
      {
        lane: gateLane,
        outputField: DISCARD_PASS,
        dependencies: ["discard_score"],
        rerunnableLeadIds: [],
      },
    )
    recordNodeState(gateNode, stateByNode)
    nodes.push(gateNode)
    // Dead-end branch collecting the discarded leads (mirrors branch:no-website
    // hanging off artifact:website). Shown only once a threshold actually
    // discards something to act on.
    if (gateActive) {
      // Only leads discarded *by score* — not never-scoreable leads (those
      // already belong to the no-website branch upstream). Shown as "done" on
      // the branch (a successful terminal bucket, like no-website); they read
      // n/a on the downstream creative tasks they can no longer enter.
      const discardedIds = leads
        .filter((lead) => {
          const s = readDiscardScore(lead)
          return s !== null && s >= threshold!
        })
        .map((lead) => lead.place_id)
      nodes.push(
        branchNode("branch:discarded", "Discarded", gateLane, discardedIds, loadedLeads),
      )
    }
  }

  let gateInserted = !gateShown
  for (const { derived, lane } of orderedTasks) {
    if (!gateInserted && lane > gateLane) {
      insertGateNodes()
      gateInserted = true
    }
    const node = taskNode(derived, lane, leads, fieldMap, outputProducer, stateByNode, gate)
    recordNodeState(node, stateByNode)
    nodes.push(node)
  }
  if (!gateInserted) insertGateNodes()

  for (const node of nodes) {
    node.activeJobIds = activeJobsForNode(node, jobs)
  }

  const warnings: string[] = []
  if (reportedTotal > loadedLeads) {
    warnings.push(
      `Flow-2 counts are based on ${loadedLeads} loaded leads, but the backend reports ${reportedTotal}.`,
    )
  }

  const biggestBottlenecks = nodes
    .filter((node) => node.kind !== "source")
    .flatMap((node) => [
      {
        nodeId: node.id,
        label: node.label,
        count: node.counts.ready,
        state: "ready" as Flow2LeadState,
      },
      {
        nodeId: node.id,
        label: node.label,
        count: node.counts.blocked,
        state: "blocked" as Flow2LeadState,
      },
      {
        nodeId: node.id,
        label: node.label,
        count: node.counts.errored,
        state: "errored" as Flow2LeadState,
      },
    ])
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)

  return {
    totalLeads: reportedTotal,
    loadedLeads,
    leads,
    nodes: nodes.sort((a, b) => a.lane - b.lane || a.label.localeCompare(b.label)),
    edges: buildEdges(derivedTasks, gateShown, gateActive),
    warnings,
    biggestBottlenecks,
  }
}
