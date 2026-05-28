// Fallback AI-task list used when the backend's /ai-tasks endpoint is
// unreachable AND `NEXT_PUBLIC_USE_MOCKS=1`. Hand-rolled rather than
// fixture-generated so the list reads naturally during local dev.

import type { AiTask } from "./types"

const NOW = "2026-05-11T10:00:00.000Z"

export const MOCK_TASKS: AiTask[] = [
  {
    name: "design_prompt",
    label: "Design brief",
    enabled: true,
    sort_order: 10,
    updated_at: NOW,
    task_type: "place",
    config: {
      model: "claude-sonnet-4-6",
      prompt_template:
        "You are a senior brand designer. Based on the business name, website screenshot, and reviews, write a 2–3 sentence visual design brief that a designer could use to mock up a new website. Be specific about color, type, and photography style.",
      included_context: ["screenshot", "reviews", "categories", "rating"],
      output_field: "design_prompt",
    },
  },
  {
    name: "visual_rating",
    label: "Visual rating",
    enabled: true,
    sort_order: 20,
    updated_at: NOW,
    task_type: "place",
    config: {
      model: "claude-haiku-4-5-20251001",
      prompt_template:
        "Rate the visual quality of this business's website from 1 (terrible) to 10 (best-in-class). Consider typography, color, layout, photography, and overall polish. Return JSON: {\"rating\": number, \"reasoning\": string}.",
      included_context: ["screenshot"],
      output_field: "visual_rating",
      response_json_schema: {
        type: "object",
        properties: {
          rating: { type: "integer", minimum: 1, maximum: 10 },
          reasoning: { type: "string" },
        },
        required: ["rating", "reasoning"],
      },
    },
  },
  {
    name: "subpage_outline",
    label: "Subpage outline",
    enabled: false,
    sort_order: 30,
    updated_at: NOW,
    task_type: "place",
    config: {
      model: "claude-sonnet-4-6",
      prompt_template:
        "Look at the crawled pages and propose a tighter information architecture for a 5-page redesign. Return a markdown list of page names with one-line summaries.",
      included_context: ["screenshot", "crawl_pages"],
      output_field: "subpage_outline",
    },
  },
  {
    name: "headline_rewrite",
    label: "Headline rewrite",
    enabled: true,
    sort_order: 40,
    updated_at: NOW,
    task_type: "place",
    config: {
      model: "claude-haiku-4-5-20251001",
      prompt_template:
        "Suggest 3 punchier headlines for this business's homepage hero. Match the tone of their existing brand. Return one per line, no numbering.",
      included_context: ["screenshot", "reviews", "categories"],
      output_field: "headline_rewrite",
    },
  },
  {
    name: "find_inspiration",
    label: "Design inspiration (browser agent)",
    enabled: true,
    sort_order: 90,
    updated_at: NOW,
    task_type: "browser_agent",
    config: {
      model: "gemma-4-26b-a4b-it",
      output_field: "design_inspirations",
      start_url_template: "https://dribbble.com/search/{{query}}?s=popular",
      prompt_template:
        "You are scouting visual inspiration for a website I'm designing.\nBrief: {{design_prompt}}\n\nBrowse the page. Open shots that look promising. For each genuinely good match, call the `add_inspiration` tool with the shot's URL, a short title, and one sentence on why it fits the brief. Stop after {{max_picks}} picks.",
      max_picks: 5,
      max_steps: 40,
    },
  },
  {
    name: "variant_design",
    label: "Variant designs",
    enabled: true,
    sort_order: 85,
    updated_at: NOW,
    task_type: "variant",
    config: {
      output_field: "variant_design",
      start_url: "https://variant.com/projects",
      generation_timeout_s: 900,
    },
  },
]
