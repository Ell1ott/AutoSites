// A single bottom-right job progress card. Self-contained: subscribes to
// /jobs/:id/stream via SSE, accumulates events, renders a compact 3-line
// preview that expands into a full streaming log (AiEventStream).
//
// Lifecycle:
//   - On `finished` or `cancelled` → auto-dismiss after 5s.
//   - On terminal `error` event → mark errored, stay visible until user closes.

"use client"

import * as React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import { AiEventStream } from "@/components/ai/ai-event-stream"
import { JobResultView } from "@/components/jobs/job-result-view"
import { JobStatusBadge } from "@/components/queue/job-status-badge"
import { JobProgressBar } from "@/components/queue/job-progress-bar"
import { useEventStream } from "@/lib/sse"
import { useJobToasterStore } from "@/lib/store/job-toaster"
import { formatEventTime } from "@/lib/format/event-time"
import { cn } from "@/lib/utils"
import type { JobEvent, JobKind, JobStatus } from "@/lib/types"

type Props = {
  jobId: string
  title: string
  kind: JobKind
}

const AUTO_DISMISS_MS = 5_000

export function JobToastCard({ jobId, title, kind }: Props): React.JSX.Element {
  const expanded = useJobToasterStore(
    (s) => s.toasts.find((t) => t.id === jobId)?.expanded ?? false,
  )
  const setExpanded = useJobToasterStore((s) => s.setExpanded)
  const dismiss = useJobToasterStore((s) => s.dismiss)

  const [events, setEvents] = useState<JobEvent[]>([])
  const [status, setStatus] = useState<JobStatus>("queued")
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(
    null,
  )

  // Subscribe to the SSE stream. The wrapper handles replay-since-seq,
  // heartbeat reconnect, and exponential backoff.
  useEventStream<JobEvent>(true, {
    url: `/jobs/${encodeURIComponent(jobId)}/stream`,
    storageKey: `job-toast:${jobId}`,
    onEvent: (event) => {
      setEvents((prev) => {
        // Dedupe by seq; preserve seq-asc order.
        if (prev.length === 0 || event.seq > prev[prev.length - 1].seq) {
          return [...prev, event]
        }
        if (prev.some((e) => e.seq === event.seq)) return prev
        const next = [...prev, event]
        next.sort((a, b) => a.seq - b.seq)
        return next
      })

      if (event.event === "started") setStatus("running")
      else if (event.event === "progress") {
        const d = event.data as { done?: number; total?: number }
        if (typeof d.done === "number" && typeof d.total === "number") {
          setProgress({ done: d.done, total: d.total })
        }
      } else if (event.event === "finished") setStatus("done")
      else if (event.event === "cancelled") setStatus("cancelled")
      else if (event.event === "error") setStatus("failed")
    },
  })

  // Auto-dismiss on terminal success / cancellation.
  useEffect(() => {
    if (status !== "done" && status !== "cancelled") return
    const t = window.setTimeout(() => dismiss(jobId), AUTO_DISMISS_MS)
    return () => window.clearTimeout(t)
  }, [status, jobId, dismiss])

  // Last 3 events for the collapsed preview. We filter out noisy debug-level
  // rows so the preview stays scannable.
  const previewEvents = useMemo(() => {
    const visible = events.filter((e) => (e.level ?? "info") !== "debug")
    return visible.slice(-3)
  }, [events])

  const isErrored = status === "failed"
  const isDone = status === "done"
  const isCancelled = status === "cancelled"
  const isFinished = isDone || isCancelled || isErrored
  const hasResults = useMemo(
    () => events.some((e) => e.event === "item_done"),
    [events],
  )

  return (
    <div
      className={cn(
        "bg-card text-card-foreground border-border w-[380px] overflow-hidden rounded-lg border shadow-lg",
        "animate-in slide-in-from-right-4 fade-in duration-300",
        isErrored && "border-destructive/40",
      )}
    >
      {(isDone || isCancelled) ? (
        <div className="h-0.5 w-full overflow-hidden bg-muted">
          <div
            className="h-full bg-success origin-left"
            style={{
              background: "var(--success)",
              animation: "toast-countdown 5s linear forwards",
            }}
          />
        </div>
      ) : null}
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2">
        <JobStatusBadge status={status} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12.5px] font-medium" title={title}>
            {title}
          </div>
          <div className="text-muted-foreground font-mono text-[10.5px]">
            {kind}
            {progress
              ? ` · ${progress.done}/${progress.total}`
              : ""}
          </div>
        </div>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          onClick={() => setExpanded(jobId, !expanded)}
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          <HugeiconsIcon
            icon={expanded ? ArrowDown01Icon : ArrowUp01Icon}
            strokeWidth={2}
          />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          onClick={() => dismiss(jobId)}
          aria-label="Dismiss"
        >
          <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
        </Button>
      </div>

      {/* Progress bar */}
      {progress && progress.total > 0 ? (
        <div className="px-3 pb-2">
          {status === "running" ? (
            <div className="relative progress-shimmer">
              <JobProgressBar done={progress.done} total={progress.total} />
            </div>
          ) : (
            <JobProgressBar done={progress.done} total={progress.total} />
          )}
        </div>
      ) : null}

      {/* Body */}
      {expanded ? (
        <ExpandedBody
          events={events}
          showResult={isFinished && hasResults}
        />
      ) : isFinished && hasResults ? (
        <div className="bg-muted/20 border-border/60 border-t">
          <JobResultView events={events} limit={4} />
        </div>
      ) : (
        <CollapsedPreview events={previewEvents} isErrored={isErrored} />
      )}

      {/* Footer status hint */}
      {isErrored ? (
        <div className="bg-destructive/10 text-destructive px-3 py-1.5 text-[11px]">
          Errored — click X to dismiss.
        </div>
      ) : null}
    </div>
  )
}

// -----------------------------------------------------------------------------
// Collapsed view: at most 3 monospace log lines
// -----------------------------------------------------------------------------

function CollapsedPreview({
  events,
  isErrored,
}: {
  events: JobEvent[]
  isErrored: boolean
}): React.JSX.Element {
  if (events.length === 0) {
    return (
      <div className="text-muted-foreground px-3 py-2 text-[11.5px] italic">
        Waiting for events…
      </div>
    )
  }

  return (
    <div className="bg-muted/20 border-border/60 flex flex-col gap-0.5 border-t px-3 py-1.5 font-mono text-[11px] leading-snug">
      {events.map((e) => (
        <div
          key={e.id ?? `${e.seq}-${e.event}`}
          className={cn(
            "flex min-w-0 gap-2 truncate",
            e.event === "error" || isErrored
              ? "text-destructive"
              : e.event === "warn"
              ? "text-amber-500"
              : "text-foreground/80",
          )}
        >
          <span className="text-muted-foreground/80 shrink-0">
            {formatEventTime(e.ts)}
          </span>
          <span className="min-w-0 flex-1 truncate">
            {summarizeEvent(e)}
          </span>
        </div>
      ))}
    </div>
  )
}

// One-line plain-text summary for the collapsed preview. Avoids the full
// AiEventStream renderer (which spans multiple lines for some events).
function summarizeEvent(e: JobEvent): string {
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
      return `✓ ${placeId} · ${ms}ms`
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
      return `← ${ms}ms · ${ti}→${to}t`
    }
    case "ai_call_error": {
      const cls = (data.error_class as string | undefined) ?? "Error"
      const msg = (data.message as string | undefined) ?? ""
      return `${cls}: ${msg}`
    }
    case "error": {
      const cls = (data.class as string | undefined) ?? "Error"
      const msg = (data.message as string | undefined) ?? e.message ?? ""
      return `✗ ${cls}: ${msg}`
    }
    case "finished":
      return "✓ Finished"
    case "cancelled":
      return "⊘ Cancelled"
    default:
      return e.message || e.event
  }
}

// -----------------------------------------------------------------------------
// Expanded view: full streaming log via the existing AiEventStream
// -----------------------------------------------------------------------------

function ExpandedBody({
  events,
  showResult,
}: {
  events: JobEvent[]
  showResult: boolean
}): React.JSX.Element {
  const ref = useRef<HTMLDivElement | null>(null)
  // AiEventStream handles its own auto-scroll, but only relative to its own
  // scrollable container. We wrap it in a max-height container so the card
  // doesn't grow unbounded.
  return (
    <div ref={ref} className="bg-muted/20 border-border/60 border-t">
      <AiEventStream
        events={events}
        mode="stream"
        autoScroll
        emptyHint="Waiting for events…"
        className="max-h-[280px]"
      />
      {showResult ? (
        <div className="border-border/60 border-t">
          <JobResultView events={events} title="Result" />
        </div>
      ) : null}
    </div>
  )
}
