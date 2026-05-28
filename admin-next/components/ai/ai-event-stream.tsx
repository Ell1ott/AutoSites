"use client"

import * as React from "react"
import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { formatEventTime } from "@/lib/format/event-time"
import type { JobEvent, JobLevel } from "@/lib/types"
import { AiCallDetailModal } from "@/components/ai/ai-call-detail-modal"

// -----------------------------------------------------------------------------
// Props
// -----------------------------------------------------------------------------

type Props = {
  /** Events in seq-ascending order. Component does not sort. */
  events: JobEvent[]
  /** Hide events below this severity. Default "all". */
  levelFilter?: "all" | "info" | "warn" | "error"
  /** When present, error events show a small "Copy to AI agent" button. */
  onExport?: (event: JobEvent) => void
  /** "stream" = dense monospace log; "list" = card-style blocks. */
  mode?: "stream" | "list"
  /** Stream-mode auto-scroll when the user is at the bottom. Default true. */
  autoScroll?: boolean
  /** Shown when events.length === 0. */
  emptyHint?: string
  className?: string
}

// -----------------------------------------------------------------------------
// Level filtering
// -----------------------------------------------------------------------------

const LEVEL_RANK: Record<JobLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

function passesLevelFilter(
  event: JobEvent,
  filter: "all" | "info" | "warn" | "error",
): boolean {
  if (filter === "all") return true
  const lvl = event.level ?? "info"
  return LEVEL_RANK[lvl] >= LEVEL_RANK[filter]
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function AiEventStream({
  events,
  levelFilter = "all",
  onExport,
  mode = "stream",
  autoScroll = true,
  emptyHint = "No events yet.",
  className,
}: Props): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [stickyToBottom, setStickyToBottom] = useState(true)
  const [openCallId, setOpenCallId] = useState<number | null>(null)

  const filtered = events.filter((e) => passesLevelFilter(e, levelFilter))

  // Auto-scroll stream-mode when sticky.
  useEffect(() => {
    if (mode !== "stream" || !autoScroll || !stickyToBottom) return
    const el = containerRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [filtered.length, mode, autoScroll, stickyToBottom])

  function handleScroll(): void {
    const el = containerRef.current
    if (!el) return
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 40
    setStickyToBottom(atBottom)
  }

  if (filtered.length === 0) {
    return (
      <div
        className={cn(
          "text-muted-foreground flex min-h-0 items-center justify-center px-2 py-3 text-sm italic",
          className,
        )}
      >
        {emptyHint}
      </div>
    )
  }

  if (mode === "list") {
    return (
      <>
        <div className={cn("flex flex-col gap-2", className)}>
          {filtered.map((event) => (
            <div
              key={event.id ?? `${event.seq}-${event.event}`}
              className="rounded-md border bg-card px-3 py-2"
            >
              <div className="text-muted-foreground font-mono text-[11px]">
                {formatEventTime(event.ts)} · {event.event}
              </div>
              <div className="mt-1 text-[13px]">
                <EventBody
                  event={event}
                  onExport={onExport}
                  onOpenAiCall={setOpenCallId}
                />
              </div>
            </div>
          ))}
        </div>
        <AiCallDetailModal logId={openCallId} onClose={() => setOpenCallId(null)} />
      </>
    )
  }

  // stream mode
  return (
    <>
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className={cn(
          "min-h-0 overflow-auto overscroll-contain font-mono text-[12px] leading-snug whitespace-pre-wrap",
          className,
        )}
      >
        {filtered.map((event) => (
          <div
            key={event.id ?? `${event.seq}-${event.event}`}
            className="flex gap-2 py-1 px-2"
          >
            <span className="text-muted-foreground shrink-0">
              {formatEventTime(event.ts)}
            </span>
            <span className="min-w-0 flex-1">
              <EventBody
                event={event}
                onExport={onExport}
                onOpenAiCall={setOpenCallId}
              />
            </span>
          </div>
        ))}
      </div>
      <AiCallDetailModal logId={openCallId} onClose={() => setOpenCallId(null)} />
    </>
  )
}

// -----------------------------------------------------------------------------
// Body renderer (per event type)
// -----------------------------------------------------------------------------

type EventBodyProps = {
  event: JobEvent
  onExport?: (event: JobEvent) => void
  onOpenAiCall?: (logId: number) => void
}

function EventBody({ event, onExport, onOpenAiCall }: EventBodyProps): React.JSX.Element {
  // Defensive: data could be missing at runtime.
  const data = (event.data ?? {}) as Record<string, unknown>

  switch (event.event) {
    case "started": {
      const total = data.total as number | undefined
      return <span>▶ Started{total ? ` · ${total} items` : ""}</span>
    }
    case "progress": {
      const done = (data.done as number | undefined) ?? 0
      const total = (data.total as number | undefined) ?? 0
      const eta = data.eta_seconds as number | undefined
      const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0
      return (
        <span className="inline-flex items-center gap-2">
          <span>
            {done}/{total}
          </span>
          <span className="bg-muted relative inline-block h-1 w-24 overflow-hidden rounded-full align-middle">
            <span
              className="bg-primary absolute left-0 top-0 h-full"
              style={{ width: `${pct}%` }}
            />
          </span>
          {typeof eta === "number" ? (
            <span className="text-muted-foreground">·{eta}s</span>
          ) : null}
        </span>
      )
    }
    case "item_start": {
      const name = (data.name as string | undefined) ?? (data.place_id as string | undefined) ?? ""
      return <span className="text-muted-foreground">▸ {name}</span>
    }
    case "item_done": {
      const placeId = (data.place_id as string | undefined) ?? ""
      const ms = (data.duration_ms as number | undefined) ?? 0
      const outputs = data.outputs as Record<string, unknown> | undefined
      const keys = outputs ? Object.keys(outputs) : []
      return (
        <span>
          <span className="text-emerald-500">✓ </span>
          {placeId} · {ms}ms
          {keys.length > 0 ? (
            <span className="text-muted-foreground"> · outputs: {keys.join(", ")}</span>
          ) : null}
        </span>
      )
    }
    case "ai_call_start": {
      const model = (data.model as string | undefined) ?? ""
      const task = data.task as string | undefined
      return (
        <span className="text-muted-foreground">
          ≫ {model}
          {task ? ` / ${task}` : ""}
        </span>
      )
    }
    case "ai_call_done": {
      const ms = (data.duration_ms as number | undefined) ?? 0
      const ti = (data.tokens_in as number | undefined) ?? 0
      const to = (data.tokens_out as number | undefined) ?? 0
      const cost = data.cost_usd as number | undefined
      return (
        <span>
          ← {ms}ms · {ti}→{to}t
          {typeof cost === "number" ? (
            <span className="text-muted-foreground"> · ${cost.toFixed(4)}</span>
          ) : null}
        </span>
      )
    }
    case "ai_call_record": {
      const logId = data.log_id as number | undefined
      const model = (data.model as string | undefined) ?? ""
      const place = (data.place_name as string | undefined) ?? (data.place_id as string | undefined) ?? ""
      const ms = (data.duration_ms as number | undefined) ?? 0
      const hasImage = Boolean(data.has_image)
      return (
        <span className="inline-flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => logId !== undefined && onOpenAiCall?.(logId)}
            className="text-left underline-offset-2 hover:underline disabled:cursor-not-allowed"
            disabled={logId === undefined || !onOpenAiCall}
            title="View full prompt + response"
          >
            <span className="text-sky-500">▣ AI call</span>{" "}
            <span>{place}</span>
            <span className="text-muted-foreground">
              {" "}
              · {model} · {ms}ms{hasImage ? " · 📷" : ""}
            </span>
          </button>
        </span>
      )
    }
    case "ai_call_error": {
      const cls = (data.error_class as string | undefined) ?? "Error"
      const msg = (data.message as string | undefined) ?? ""
      const retry = data.retry_in_ms as number | undefined
      return (
        <span className="text-destructive">
          {cls}: {msg}
          {typeof retry === "number" ? (
            <span className="text-muted-foreground"> · retry in {retry}ms</span>
          ) : null}
        </span>
      )
    }
    case "http_call": {
      const host = (data.host as string | undefined) ?? ""
      const status = (data.status as number | undefined) ?? 0
      const ms = (data.duration_ms as number | undefined) ?? 0
      return (
        <span className="text-muted-foreground">
          {host} {status} · {ms}ms
        </span>
      )
    }
    case "error": {
      const cls = (data.class as string | undefined) ?? "Error"
      const msg = (data.message as string | undefined) ?? event.message ?? ""
      const file = data.file as string | undefined
      const line = data.line as number | undefined
      const tb = data.traceback as string | undefined
      return (
        <span className="inline-flex flex-col gap-1">
          <span className="text-destructive font-semibold inline-flex items-center gap-2 flex-wrap">
            <span>
              {cls}: {msg}
              {file ? (
                <span className="text-muted-foreground font-normal">
                  {" "}
                  ({file}
                  {typeof line === "number" ? `:${line}` : ""})
                </span>
              ) : null}
            </span>
            {onExport ? (
              <Button
                type="button"
                size="xs"
                variant="ghost"
                onClick={() => onExport(event)}
              >
                Copy to AI agent
              </Button>
            ) : null}
          </span>
          {tb ? (
            <details className="text-muted-foreground">
              <summary className="cursor-pointer text-[11px]">traceback</summary>
              <pre className="text-[11px] whitespace-pre-wrap mt-1">{tb}</pre>
            </details>
          ) : null}
        </span>
      )
    }
    case "warn": {
      const msg =
        event.message ||
        (data.message as string | undefined) ||
        safeStringify(data)
      return <span className="text-amber-500">{msg}</span>
    }
    case "metric": {
      const key = (data.key as string | undefined) ?? ""
      const value = data.value as number | string | undefined
      const unit = data.unit as string | undefined
      return (
        <span>
          📊 {key} = {String(value)}
          {unit ? ` ${unit}` : ""}
        </span>
      )
    }
    case "log": {
      const text = (data.text as string | undefined) ?? event.message ?? ""
      return <span className="text-muted-foreground">{text}</span>
    }
    case "finished": {
      const summary = data.summary as Record<string, unknown> | undefined
      const keys = summary ? Object.keys(summary) : []
      return (
        <span className="text-emerald-500">
          ✔ Finished
          {keys.length > 0 ? (
            <span className="text-muted-foreground"> · {keys.join(", ")}</span>
          ) : null}
        </span>
      )
    }
    case "cancelled": {
      const at = data.at_item as string | undefined
      return (
        <span>
          ⨯ Cancelled
          {at ? (
            <span className="text-muted-foreground"> · {at}</span>
          ) : null}
        </span>
      )
    }
    default: {
      // Forward-compat fallback for unknown event kinds.
      return (
        <span className="text-muted-foreground">
          {event.event}: {safeStringify(data)}
        </span>
      )
    }
  }
}

function safeStringify(v: unknown): string {
  if (v == null) return ""
  if (typeof v === "string") return v
  try {
    return JSON.stringify(v)
  } catch {
    return String(v)
  }
}
