// Per-item AI result preview shared by the job toaster and the task-editor
// test-run panel. Reads `item_done.outputs` off the event stream — no extra
// backend wiring needed. Renders nothing when there are no results (so it's
// safe to mount for non-ai_task jobs).

"use client"

import * as React from "react"
import { useMemo } from "react"

import { cn } from "@/lib/utils"
import type { JobEvent } from "@/lib/types"

type Props = {
  events: JobEvent[]
  className?: string
  /** When set, only this many rows render; the rest collapse into "+N more". */
  limit?: number
  /** Optional heading. */
  title?: string
}

type ResultRow = {
  placeId: string
  name?: string
  outputs: Record<string, unknown>
}

function collectResults(events: JobEvent[]): ResultRow[] {
  const names = new Map<string, string>()
  for (const e of events) {
    if (e.event === "item_start") {
      const d = e.data as { place_id?: string; name?: string }
      if (d.place_id && d.name) names.set(d.place_id, d.name)
    }
  }
  const rows: ResultRow[] = []
  for (const e of events) {
    if (e.event !== "item_done") continue
    const d = e.data as {
      place_id?: string
      outputs?: Record<string, unknown>
    }
    if (!d.place_id) continue
    rows.push({
      placeId: d.place_id,
      name: names.get(d.place_id),
      outputs: d.outputs ?? {},
    })
  }
  return rows
}

function formatValue(v: unknown): string {
  if (v == null) return "—"
  if (typeof v === "string") return v
  if (typeof v === "number" || typeof v === "boolean") return String(v)
  try {
    return JSON.stringify(v)
  } catch {
    return String(v)
  }
}

export function JobResultView({
  events,
  className,
  limit,
  title,
}: Props): React.JSX.Element | null {
  const rows = useMemo(() => collectResults(events), [events])
  if (rows.length === 0) return null
  const shown = limit ? rows.slice(0, limit) : rows
  const overflow = limit && rows.length > limit ? rows.length - limit : 0

  return (
    <div
      className={cn(
        "flex flex-col gap-0.5 px-3 py-1.5 font-mono text-[11.5px] leading-snug",
        className,
      )}
    >
      {title ? (
        <div className="mb-1 text-[10.5px] uppercase tracking-wide text-muted-foreground">
          {title}
        </div>
      ) : null}
      {shown.map((r) => {
        const entries = Object.entries(r.outputs)
        const summary = entries.length
          ? entries.map(([k, v]) => `${k}: ${formatValue(v)}`).join(" · ")
          : "—"
        return (
          <div key={r.placeId} className="flex min-w-0 items-baseline gap-2">
            <span className="shrink-0 text-emerald-500">✓</span>
            <span
              className="shrink-0 max-w-[140px] truncate text-foreground/80"
              title={r.name ?? r.placeId}
            >
              {r.name ?? r.placeId}
            </span>
            <span className="min-w-0 flex-1 truncate text-foreground">
              {summary}
            </span>
          </div>
        )
      })}
      {overflow > 0 ? (
        <div className="mt-0.5 text-[10.5px] text-muted-foreground">
          +{overflow} more
        </div>
      ) : null}
    </div>
  )
}
