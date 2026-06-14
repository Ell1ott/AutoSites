"use client"

import * as React from "react"
import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { formatEventTime } from "@/lib/format/event-time"
import { eventsToPlainText } from "@/lib/format/event-line"
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
  /** Show a floating "Copy logs" button (timestamp-free plain text). Default true. */
  copyable?: boolean
  className?: string
}

// -----------------------------------------------------------------------------
// Copy-logs button
// -----------------------------------------------------------------------------

function CopyLogsButton({ events }: { events: JobEvent[] }): React.JSX.Element {
  const [copied, setCopied] = useState(false)
  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(eventsToPlainText(events))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard may be unavailable (e.g. insecure context); ignore.
    }
  }
  return (
    <Button
      type="button"
      size="xs"
      variant="secondary"
      onClick={copy}
      className="absolute right-2 top-2 z-10 opacity-70 hover:opacity-100"
      title="Copy full logs without timestamps"
    >
      {copied ? "Copied" : "Copy logs"}
    </Button>
  )
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
  copyable = true,
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
      <div className={cn("relative", className)}>
        {copyable ? <CopyLogsButton events={filtered} /> : null}
        <div className="flex flex-col gap-2">
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
      </div>
    )
  }

  // stream mode
  return (
    <div className={cn("relative min-h-0", className)}>
      {copyable ? <CopyLogsButton events={filtered} /> : null}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full min-h-0 overflow-auto overscroll-contain font-mono text-[12px] leading-snug whitespace-pre-wrap"
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
    </div>
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
      const entries = outputs ? Object.entries(outputs) : []
      // Surface error values inline so failures are immediately readable.
      const errEntry = entries.find(([k]) => k === "error" || k.endsWith("_error"))
      const errText = errEntry ? formatOutputValue(errEntry[1]) : undefined
      const failed = Boolean(errText)
      const hasDetails = entries.length > 0
      return (
        <span className="inline-flex flex-col gap-0.5">
          <span>
            <span className={failed ? "text-destructive" : "text-emerald-500"}>
              {failed ? "✗ " : "✓ "}
            </span>
            {placeId} · {Math.round(ms)}ms
            {errText ? (
              <span className="text-destructive"> · {errText}</span>
            ) : entries.length > 0 ? (
              <span className="text-muted-foreground">
                {" "}
                · outputs: {entries.map(([k]) => k).join(", ")}
              </span>
            ) : null}
          </span>
          {hasDetails ? (
            <details className="text-muted-foreground">
              <summary className="cursor-pointer text-[11px] select-none">
                details
              </summary>
              <pre className="text-[11px] whitespace-pre-wrap mt-1">
                {entries
                  .map(([k, v]) => `${k}: ${formatOutputValue(v)}`)
                  .join("\n")}
              </pre>
            </details>
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
      const preview = previewOneLine(data.response_preview as string | undefined)
      return (
        <span className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={() => logId !== undefined && onOpenAiCall?.(logId)}
            className="shrink-0 text-left underline-offset-2 hover:underline disabled:cursor-not-allowed"
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
          {preview ? (
            <span
              className="text-muted-foreground/80 min-w-0 flex-1 truncate italic"
              title={preview}
            >
              “{preview}”
            </span>
          ) : null}
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

/** Collapse a multi-line preview to a single trimmed line. CSS handles the
 * length cap via `truncate`; the backend already caps the raw text at ~240. */
function previewOneLine(v: string | undefined): string {
  if (!v) return ""
  return v.replace(/\s+/g, " ").trim()
}

function formatOutputValue(v: unknown): string {
  if (v == null) return "—"
  if (typeof v === "string") return v
  if (typeof v === "number" || typeof v === "boolean") return String(v)
  try {
    return JSON.stringify(v, null, 2)
  } catch {
    return String(v)
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
