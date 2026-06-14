// Plain-text serialization of job events for the "Copy full logs" action.
// Deliberately omits timestamps — the user wants the message content only.

import type { JobEvent } from "@/lib/types"

function fmt(v: unknown): string {
  if (v == null) return "—"
  if (typeof v === "string") return v
  if (typeof v === "number" || typeof v === "boolean") return String(v)
  try {
    return JSON.stringify(v)
  } catch {
    return String(v)
  }
}

/** One timestamp-free text line (or block) describing a single event. */
export function eventToLogLine(e: JobEvent): string {
  const data = (e.data ?? {}) as Record<string, unknown>
  switch (e.event) {
    case "started": {
      const total = data.total as number | undefined
      return total ? `▶ Started · ${total} items` : "▶ Started"
    }
    case "progress": {
      const done = (data.done as number | undefined) ?? 0
      const total = (data.total as number | undefined) ?? 0
      return `${done}/${total}`
    }
    case "item_start": {
      const name =
        (data.name as string | undefined) ??
        (data.place_id as string | undefined) ??
        ""
      return `▸ ${name}`
    }
    case "item_done": {
      const placeId = (data.place_id as string | undefined) ?? ""
      const ms = (data.duration_ms as number | undefined) ?? 0
      const outputs = data.outputs as Record<string, unknown> | undefined
      const entries = outputs ? Object.entries(outputs) : []
      const errEntry = entries.find(([k]) => k === "error" || k.endsWith("_error"))
      if (errEntry && errEntry[1] != null) {
        return `✗ ${placeId} · ${Math.round(ms)}ms · ${fmt(errEntry[1])}`
      }
      const out = entries.length
        ? ` · ${entries.map(([k, v]) => `${k}: ${fmt(v)}`).join(", ")}`
        : ""
      return `✓ ${placeId} · ${Math.round(ms)}ms${out}`
    }
    case "ai_call_start": {
      const model = (data.model as string | undefined) ?? ""
      const task = data.task as string | undefined
      return `≫ ${model}${task ? ` / ${task}` : ""}`
    }
    case "ai_call_done": {
      const ms = (data.duration_ms as number | undefined) ?? 0
      const ti = (data.tokens_in as number | undefined) ?? 0
      const to = (data.tokens_out as number | undefined) ?? 0
      const cost = data.cost_usd as number | undefined
      return `← ${ms}ms · ${ti}→${to}t${typeof cost === "number" ? ` · $${cost.toFixed(4)}` : ""}`
    }
    case "ai_call_record": {
      const model = (data.model as string | undefined) ?? ""
      const place =
        (data.place_name as string | undefined) ??
        (data.place_id as string | undefined) ??
        ""
      const ms = (data.duration_ms as number | undefined) ?? 0
      const preview = (data.response_preview as string | undefined)
        ?.replace(/\s+/g, " ")
        .trim()
      const prev = preview ? ` · “${preview.slice(0, 120)}”` : ""
      return `▣ AI call ${place} · ${model} · ${ms}ms${prev}`
    }
    case "ai_call_error": {
      const cls = (data.error_class as string | undefined) ?? "Error"
      const msg = (data.message as string | undefined) ?? ""
      return `${cls}: ${msg}`
    }
    case "http_call": {
      const host = (data.host as string | undefined) ?? ""
      const status = (data.status as number | undefined) ?? 0
      const ms = (data.duration_ms as number | undefined) ?? 0
      return `${host} ${status} · ${ms}ms`
    }
    case "error": {
      const cls = (data.class as string | undefined) ?? "Error"
      const msg = (data.message as string | undefined) ?? e.message ?? ""
      const file = data.file as string | undefined
      const line = data.line as number | undefined
      const tb = data.traceback as string | undefined
      const loc = file ? ` (${file}${typeof line === "number" ? `:${line}` : ""})` : ""
      return `✗ ${cls}: ${msg}${loc}${tb ? `\n${tb}` : ""}`
    }
    case "warn":
      return e.message || (data.message as string | undefined) || fmt(data)
    case "metric": {
      const key = (data.key as string | undefined) ?? ""
      const value = data.value as number | string | undefined
      const unit = data.unit as string | undefined
      return `📊 ${key} = ${String(value)}${unit ? ` ${unit}` : ""}`
    }
    case "log":
      return (data.text as string | undefined) ?? e.message ?? ""
    case "finished": {
      const summary = data.summary as Record<string, unknown> | undefined
      const out = summary
        ? ` · ${Object.entries(summary).map(([k, v]) => `${k}: ${fmt(v)}`).join(", ")}`
        : ""
      return `✔ Finished${out}`
    }
    case "cancelled": {
      const at = data.at_item as string | undefined
      return `⨯ Cancelled${at ? ` · ${at}` : ""}`
    }
    default:
      return e.message ? `${e.event}: ${e.message}` : `${e.event}: ${fmt(data)}`
  }
}

/** Full log as plain text, one event per line, no timestamps. */
export function eventsToPlainText(events: JobEvent[]): string {
  return events.map(eventToLogLine).join("\n")
}
