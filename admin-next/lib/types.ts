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

export type FieldSource = "column" | "dynamic"

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
  updated_at: string
}

export type Lead = SlimLead & {
  data: unknown // raw Google API response, can be huge — only fetched on detail
  recent_logs?: JobLogEntry[]
}

export type LeadsListResponse = {
  items: SlimLead[]
  next_cursor?: string
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
  | "crawl"
  | "html_to_md"
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

export type AiTaskConfig = {
  meta_prompt?: string
  prompt_template?: string
  model: string
  included_context?: string[]
  response_json_schema?: unknown
  [k: string]: unknown
}

export type AiTask = {
  name: string
  label: string
  config: AiTaskConfig
  enabled: boolean
  sort_order: number
  updated_at: string
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
