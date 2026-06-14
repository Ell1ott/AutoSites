// Backend contract types for the AutoSites admin frontend.
// Source of truth: the FastAPI backend running on the Raspberry Pi.

// -----------------------------------------------------------------------------
// Fields / schema discovery
// -----------------------------------------------------------------------------

export type FieldType =
  | "string"
  | "integer"
  | "number"
  | "boolean"
  | "array"
  | `array<${"string" | "integer" | "number" | "boolean"}>`
  | "object"

export type FieldSource = "column" | "dynamic" | "data"

export type FieldDescriptor = {
  key: string
  type: FieldType
  source: FieldSource
  coverage: number
  min?: number
  max?: number
  sample?: unknown
  // Optional override metadata merged in by the backend.
  display?: string
  format?: string
  filterable?: boolean
  editable?: boolean
  enum_values?: unknown[]
}

export type FieldsResponse = {
  columns: FieldDescriptor[]
  dynamic: FieldDescriptor[]
  /** Top-level keys on `places.data` (raw Google JSON); absent on older APIs. */
  data_fields?: FieldDescriptor[]
}

/** Filter / sort key for API + `readField` (e.g. `dynamic.foo`, `data.formattedAddress`). */
export function fieldClauseKey(f: FieldDescriptor): string {
  if (f.source === "dynamic") return `dynamic.${f.key}`
  if (f.source === "data") return `data.${f.key}`
  return f.key
}

// Known field_meta.format constants. Other formats may exist; UI falls back to
// a default widget when unknown.
export const FIELD_FORMAT_STARS_1_10 = "stars-1-10"
export const FIELD_FORMAT_NUMERIC_STRING = "numeric-string"

// -----------------------------------------------------------------------------
// Filter / sort types
// -----------------------------------------------------------------------------

export type FilterOp =
  | "eq"
  | "ne"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "like"
  | "in"
  | "exists"
  | "notexists"

export type FilterClause = {
  key: string // top-level column name, or `dynamic.*` path style
  op: FilterOp
  value?: unknown // not required for exists/notexists
}

export type FilterClauses = FilterClause[]

export type SortClause = { key: string; dir: "asc" | "desc" }

// -----------------------------------------------------------------------------
// Leads
// -----------------------------------------------------------------------------

export type SlimLead = {
  place_id: string
  name: string
  rating: number | null
  review_count: number | null
  website: string | null
  business_status: string | null
  lead_score: number | null // user's manual 1..10
  dynamic: Record<string, unknown> // every observed dynamic.* key — sparse
  /** Raw Google / import JSON blob (`places.data`); optional on mocks. */
  data?: Record<string, unknown>
  /** True when `screenshots/{place_id}.png` exists on the backend. */
  has_screenshot?: boolean
  /** True when `screenshots/{place_id}.md` (root markdown) exists. */
  has_markdown?: boolean
  /** True when `dynamic.website_contacts.extracted_at` is set. */
  has_contacts?: boolean
  updated_at: string
}

export type Lead = SlimLead & {
  data: unknown // raw Google API response, can be huge — only fetched on detail
  recent_logs?: JobLogEntry[]
}

export type LeadsListResponse = {
  items: SlimLead[]
  total?: number
  limit?: number
  offset?: number
}

// A single job log entry surfaced on a lead detail. Backend returns this as the
// flattened structured event shape (same union as JobEvent).
export type JobLogEntry = JobEvent

// -----------------------------------------------------------------------------
// Jobs & events
// -----------------------------------------------------------------------------

export type JobStatus = "queued" | "running" | "done" | "failed" | "cancelled"

export type JobKind =
  | "fetch_leads"
  | "ai_task"
  | "generate_inspiration_queries"
  | "find_inspiration"
  | "variant_design"
  | "crawl"
  | "html_to_md"
  | "extract_contacts"
  | (string & {})

export type Job = {
  id: string
  kind: JobKind
  status: JobStatus
  args: Record<string, unknown>
  progress?: { done: number; total: number; eta_seconds?: number }
  result?: unknown
  error?: string | null
  created_at: string
  started_at?: string | null
  finished_at?: string | null
  cancel_requested?: boolean
}

export type JobMetrics = {
  items_per_minute?: number
  avg_item_duration_ms?: number
  ai_calls?: number
  tokens_in?: number
  tokens_out?: number
  estimated_cost_usd?: number
  errors?: number
  warnings?: number
}

export type JobSnapshot = Job & {
  current_item?: { place_id?: string; name?: string; since_ms?: number }
  metrics?: JobMetrics
  last_events?: JobEvent[]
  last_error?: JobEvent | null
}

export type JobLevel = "debug" | "info" | "warn" | "error"

export type JobEventBase = {
  id: number
  job_id: string
  seq: number
  ts: string
  level: JobLevel
  message: string
}

export type JobEvent =
  | (JobEventBase & {
      event: "started"
      data: { total?: number; args?: Record<string, unknown> }
    })
  | (JobEventBase & {
      event: "progress"
      data: { done: number; total: number; eta_seconds?: number }
    })
  | (JobEventBase & {
      event: "item_start"
      data: { place_id: string; name?: string }
    })
  | (JobEventBase & {
      event: "item_done"
      data: {
        place_id: string
        duration_ms: number
        outputs?: Record<string, unknown>
      }
    })
  | (JobEventBase & {
      event: "ai_call_start"
      data: {
        model: string
        task?: string
        place_id?: string
        prompt_chars?: number
      }
    })
  | (JobEventBase & {
      event: "ai_call_done"
      data: {
        duration_ms: number
        tokens_in: number
        tokens_out: number
        cost_usd?: number
      }
    })
  | (JobEventBase & {
      event: "ai_call_record"
      data: {
        log_id: number
        place_id?: string | null
        place_name?: string | null
        task: string
        output_field?: string
        provider: string
        model: string
        duration_ms: number
        has_image: boolean
        prompt_preview: string
        response_preview: string
      }
    })
  | (JobEventBase & {
      event: "ai_call_error"
      data: {
        model: string
        error_class: string
        message: string
        retry_in_ms?: number
      }
    })
  | (JobEventBase & {
      event: "http_call"
      data: { host: string; status: number; duration_ms: number }
    })
  | (JobEventBase & {
      event: "error"
      data: {
        class: string
        message: string
        traceback?: string
        file?: string
        line?: number
        context?: Record<string, unknown>
      }
    })
  | (JobEventBase & {
      event: "warn"
      data: Record<string, unknown>
    })
  | (JobEventBase & {
      event: "metric"
      data: { key: string; value: number; unit?: string }
    })
  | (JobEventBase & {
      event: "log"
      data: { text: string }
    })
  | (JobEventBase & {
      event: "finished"
      data: { summary?: Record<string, unknown> }
    })
  | (JobEventBase & {
      event: "cancelled"
      data: { at_item?: string }
    })
  // Forward-compat fallback for unknown event kinds.
  | (JobEventBase & { event: string; data: Record<string, unknown> })

// -----------------------------------------------------------------------------
// AI tasks & runs
// -----------------------------------------------------------------------------

export type AiTaskType = "place" | "browser_agent" | "variant"

export type AiTaskConfig = {
  meta_prompt?: string
  prompt_template?: string
  model?: string
  included_context?: string[]
  response_json_schema?: unknown
  // Browser-agent-specific (only meaningful when task_type === "browser_agent").
  start_url_template?: string
  max_picks?: number
  max_steps?: number
  output_field?: string
  // Variant automation (task_type === "variant").
  start_url?: string
  generation_timeout_s?: number
  // Discard gate (only meaningful on the discard_score task): leads scoring at
  // or above this value are discarded and do not continue into creative work.
  discard_at?: number
  [k: string]: unknown
}

export type AiTask = {
  name: string
  label: string
  config: AiTaskConfig
  enabled: boolean
  sort_order: number
  updated_at: string
  task_type: AiTaskType
}

export type InspirationPick = {
  url: string
  title: string
  why?: string
  screenshot?: string | null
}

export type VariantDesignPreview = {
  index: number
  html_path: string
  title?: string
  /** User bookmark — persisted on the lead's variant_design output. */
  flagged?: boolean
}

export type VariantDesignResult = {
  url: string | null
  status: "complete" | "timed_out" | "failed" | "running"
  designs: VariantDesignPreview[]
  captured_at?: string
  error?: string
}

export type AiRunStatus = "running" | "done" | "failed" | "cancelled"

export type AiRun = {
  run_id: string
  task: string
  started_at: string
  finished_at: string | null
  status: AiRunStatus
  args: Record<string, unknown>
  counts?: Record<string, number>
  error?: string | null
}

// -----------------------------------------------------------------------------
// Rules (soft backend dependency; endpoints may not exist yet)
// -----------------------------------------------------------------------------

export type Rule = {
  id: string
  name: string
  enabled: boolean
  task: string // task name
  filter: FilterClauses
  model_override?: string
  included_context_override?: string[]
}

// -----------------------------------------------------------------------------
// Strategy — paste-ready "what should I do next?" prompt (GET /strategy)
// -----------------------------------------------------------------------------

export type StrategyPromptResponse = {
  /** Full paste-ready bundle: system framing + operation snapshot. */
  prompt: string
  /** Structured snapshot the prompt is built from (kept for future previews). */
  snapshot: Record<string, unknown>
}
