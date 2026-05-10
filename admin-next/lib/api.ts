// Typed fetch wrapper for the AutoSites Pi backend.
//
// Reads `NEXT_PUBLIC_PI_URL` for the base URL and `NEXT_PUBLIC_BACKEND_TOKEN`
// for bearer auth. The token header is omitted entirely when the env var is
// absent so local dev without a token doesn't 401-itself.

import { clausesToParams } from "./url"
import type {
  AiRun,
  AiTask,
  FieldsResponse,
  FilterClause,
  Job,
  JobEvent,
  JobLevel,
  JobSnapshot,
  JobStatus,
  Lead,
  LeadsListResponse,
  SortClause,
} from "./types"

// -----------------------------------------------------------------------------
// Error type
// -----------------------------------------------------------------------------

export class ApiError extends Error {
  status: number
  body?: unknown
  constructor(status: number, message: string, body?: unknown) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.body = body
  }
}

// -----------------------------------------------------------------------------
// request<T>
// -----------------------------------------------------------------------------

type RequestInitJSON = Omit<RequestInit, "body"> & {
  json?: unknown
  // Pass `expect: "text"` to receive the response body as a string. Default is JSON.
  expect?: "json" | "text"
}

function getBaseUrl(): string {
  const base = process.env.NEXT_PUBLIC_PI_URL
  if (!base) {
    throw new ApiError(
      0,
      "NEXT_PUBLIC_PI_URL is not set — cannot reach the backend.",
    )
  }
  return base.replace(/\/+$/, "")
}

function buildHeaders(init?: RequestInitJSON): Headers {
  const headers = new Headers(init?.headers)
  const token = process.env.NEXT_PUBLIC_BACKEND_TOKEN
  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }
  if (init?.json !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }
  return headers
}

async function request<T>(
  path: string,
  init?: RequestInitJSON,
): Promise<T> {
  const base = getBaseUrl()
  const url = path.startsWith("http") ? path : `${base}${path}`
  const headers = buildHeaders(init)

  const fetchInit: RequestInit = {
    ...init,
    headers,
    body:
      init?.json !== undefined
        ? JSON.stringify(init.json)
        : (init as RequestInit | undefined)?.body,
  }
  // Strip helper-only keys so they don't leak into fetch().
  delete (fetchInit as { json?: unknown }).json
  delete (fetchInit as { expect?: unknown }).expect

  const res = await fetch(url, fetchInit)

  const expect = init?.expect ?? "json"

  if (!res.ok) {
    let body: unknown
    try {
      // Try JSON first, fall back to text.
      const text = await res.text()
      try {
        body = JSON.parse(text)
      } catch {
        body = text
      }
    } catch {
      body = undefined
    }
    const message =
      typeof body === "object" && body && "error" in body
        ? String((body as { error: unknown }).error)
        : `HTTP ${res.status} for ${path}`
    throw new ApiError(res.status, message, body)
  }

  if (expect === "text") {
    return (await res.text()) as unknown as T
  }

  // 204 No Content / empty body → return undefined cast to T.
  if (res.status === 204) return undefined as unknown as T

  const text = await res.text()
  if (!text) return undefined as unknown as T
  return JSON.parse(text) as T
}

// -----------------------------------------------------------------------------
// Query helpers
// -----------------------------------------------------------------------------

function appendQuery(path: string, params: URLSearchParams): string {
  const qs = params.toString()
  if (!qs) return path
  return `${path}${path.includes("?") ? "&" : "?"}${qs}`
}

// -----------------------------------------------------------------------------
// API surface
// -----------------------------------------------------------------------------

export const api = {
  // ----- /fields -----
  async fields(): Promise<FieldsResponse> {
    return request<FieldsResponse>("/fields")
  },

  // ----- /leads -----
  async leads(opts?: {
    slim?: boolean
    filters?: FilterClause[]
    sort?: SortClause
    cursor?: string
  }): Promise<LeadsListResponse> {
    const params = clausesToParams(opts?.filters ?? [], opts?.sort)
    if (opts?.slim ?? true) params.set("slim", "1")
    if (opts?.cursor) params.set("cursor", opts.cursor)
    return request<LeadsListResponse>(appendQuery("/leads", params))
  },

  async lead(id: string): Promise<Lead> {
    return request<Lead>(`/leads/${encodeURIComponent(id)}`)
  },

  async patchLead(id: string, set: Record<string, unknown>): Promise<Lead> {
    return request<Lead>(`/leads/${encodeURIComponent(id)}`, {
      method: "PATCH",
      json: { set },
    })
  },

  async rateLead(id: string, value: number): Promise<{ ok: true }> {
    return request<{ ok: true }>(`/leads/${encodeURIComponent(id)}/rating`, {
      method: "PUT",
      json: { value },
    })
  },

  // ----- /ai-tasks -----
  async aiTasks(): Promise<AiTask[]> {
    return request<AiTask[]>("/ai-tasks")
  },

  async createAiTask(task: Omit<AiTask, "updated_at">): Promise<AiTask> {
    return request<AiTask>("/ai-tasks", {
      method: "POST",
      json: task,
    })
  },

  async patchAiTask(name: string, patch: Partial<AiTask>): Promise<AiTask> {
    return request<AiTask>(`/ai-tasks/${encodeURIComponent(name)}`, {
      method: "PATCH",
      json: patch,
    })
  },

  // ----- /ai-runs -----
  async aiRuns(opts?: { task?: string }): Promise<AiRun[]> {
    const params = new URLSearchParams()
    if (opts?.task) params.set("task", opts.task)
    return request<AiRun[]>(appendQuery("/ai-runs", params))
  },

  async aiRun(id: string): Promise<AiRun> {
    return request<AiRun>(`/ai-runs/${encodeURIComponent(id)}`)
  },

  // ----- /jobs -----
  async jobs(opts?: {
    status?: JobStatus | JobStatus[]
    kind?: string
  }): Promise<Job[]> {
    const params = new URLSearchParams()
    if (opts?.status) {
      const statuses = Array.isArray(opts.status) ? opts.status : [opts.status]
      for (const s of statuses) params.append("status", s)
    }
    if (opts?.kind) params.set("kind", opts.kind)
    return request<Job[]>(appendQuery("/jobs", params))
  },

  async job(id: string): Promise<JobSnapshot> {
    return request<JobSnapshot>(`/jobs/${encodeURIComponent(id)}`)
  },

  async startJob(
    kind: string,
    args: Record<string, unknown>,
  ): Promise<{ id: string; status: JobStatus }> {
    return request<{ id: string; status: JobStatus }>("/jobs", {
      method: "POST",
      json: { kind, args },
    })
  },

  async cancelJob(id: string): Promise<{ ok: true }> {
    return request<{ ok: true }>(
      `/jobs/${encodeURIComponent(id)}/cancel`,
      { method: "POST" },
    )
  },

  async jobEvents(
    id: string,
    opts?: { since?: number; event?: string; level?: JobLevel; limit?: number },
  ): Promise<JobEvent[]> {
    const params = new URLSearchParams()
    if (opts?.since !== undefined) params.set("since", String(opts.since))
    if (opts?.event) params.set("event", opts.event)
    if (opts?.level) params.set("level", opts.level)
    if (opts?.limit !== undefined) params.set("limit", String(opts.limit))
    return request<JobEvent[]>(
      appendQuery(`/jobs/${encodeURIComponent(id)}/events`, params),
    )
  },

  /**
   * Export a job (or a single event within a job) to markdown or json.
   * Markdown comes back as a string; JSON comes back parsed.
   */
  async exportJob(
    id: string,
    opts: { event?: number; format: "markdown" | "json" },
  ): Promise<string | unknown> {
    const params = new URLSearchParams()
    if (opts.event !== undefined) params.set("event", String(opts.event))
    params.set("format", opts.format)
    const path = appendQuery(
      `/jobs/${encodeURIComponent(id)}/export`,
      params,
    )
    if (opts.format === "markdown") {
      return request<string>(path, { expect: "text" })
    }
    return request<unknown>(path)
  },

  // ----- /healthz -----
  async healthz(): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>("/healthz")
  },
}

export type Api = typeof api
