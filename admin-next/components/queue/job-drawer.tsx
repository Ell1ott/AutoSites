"use client"

import * as React from "react"
import { useEffect, useMemo, useState } from "react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { HugeiconsIcon } from "@hugeicons/react"
import { Cancel01Icon, Copy01Icon } from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { AiEventStream } from "@/components/ai/ai-event-stream"
import { JobProgressBar } from "@/components/queue/job-progress-bar"
import { JobStatusBadge } from "@/components/queue/job-status-badge"
import {
  formatEtaSeconds,
  formatRelativeTime,
} from "@/components/queue/relative-time"
import { api, ApiError } from "@/lib/api"
import { useEventStream } from "@/lib/sse"
import { cn } from "@/lib/utils"
import type { JobEvent, JobLevel, JobSnapshot } from "@/lib/types"

type LevelFilter = "all" | "info" | "warn" | "error"

type Props = {
  /** When non-null, drawer is open for this job id. */
  jobId: string | null
  onClose: () => void
}

export function JobDrawer({ jobId, onClose }: Props) {
  const open = jobId !== null

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-50 bg-black/30 duration-100 supports-backdrop-filter:backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
        />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            "fixed inset-y-0 right-0 z-50 flex flex-col gap-0 bg-popover text-popover-foreground shadow-xl outline-none ring-1 ring-foreground/5",
            "w-[min(50vw,720px)] min-w-[420px] max-w-full",
            "duration-150 data-open:animate-in data-open:slide-in-from-right-8 data-open:fade-in-0 data-closed:animate-out data-closed:slide-out-to-right-8 data-closed:fade-out-0",
          )}
        >
          <DialogPrimitive.Title className="sr-only">
            Job details
          </DialogPrimitive.Title>
          {jobId ? <JobDrawerBody jobId={jobId} onClose={onClose} /> : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

// -----------------------------------------------------------------------------
// Body
// -----------------------------------------------------------------------------

function JobDrawerBody({ jobId, onClose }: { jobId: string; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [events, setEvents] = useState<JobEvent[]>([])
  const [streamError, setStreamError] = useState<unknown>(null)
  const [streamOpened, setStreamOpened] = useState(false)
  const [level, setLevel] = useState<LevelFilter>("all")
  const [copyHint, setCopyHint] = useState<string | null>(null)

  // Reset events whenever the open job changes.
  useEffect(() => {
    setEvents([])
    setStreamError(null)
    setStreamOpened(false)
  }, [jobId])

  // Snapshot polling.
  const snapshotQuery = useQuery<JobSnapshot>({
    queryKey: ["job", jobId],
    queryFn: () => api.job(jobId),
    refetchInterval: (q) => {
      const data = q.state.data as JobSnapshot | undefined
      if (!data) return 2000
      const active = data.status === "running" || data.status === "queued"
      return active ? 2000 : false
    },
    refetchIntervalInBackground: false,
  })

  const snapshot = snapshotQuery.data
  const isActive = snapshot?.status === "running" || snapshot?.status === "queued"

  // SSE event stream while the drawer is open.
  useEventStream<JobEvent>(true, {
    url: `/jobs/${encodeURIComponent(jobId)}/stream`,
    storageKey: `job-stream:${jobId}`,
    onEvent: (event) => {
      setEvents((prev) => {
        // Dedupe by seq; preserve seq-asc order.
        if (prev.length === 0 || event.seq > prev[prev.length - 1].seq) {
          return [...prev, event]
        }
        const exists = prev.some((e) => e.seq === event.seq)
        if (exists) return prev
        const next = [...prev, event]
        next.sort((a, b) => a.seq - b.seq)
        return next
      })
    },
    onOpen: () => {
      setStreamError(null)
      setStreamOpened(true)
    },
    onError: (err) => setStreamError(err),
  })

  // Cancel mutation.
  const cancelMutation = useMutation({
    mutationFn: () => api.cancelJob(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job", jobId] })
      queryClient.invalidateQueries({ queryKey: ["jobs"] })
    },
  })

  // Copy job id.
  async function handleCopyId() {
    try {
      await navigator.clipboard.writeText(jobId)
      flashHint("Copied ID")
    } catch {
      flashHint("Copy failed")
    }
  }

  // Export event → markdown → clipboard.
  async function handleExport(event: JobEvent) {
    try {
      const text = (await api.exportJob(jobId, {
        event: event.id,
        format: "markdown",
      })) as string
      await navigator.clipboard.writeText(text)
      flashHint("Copied to clipboard")
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Export failed"
      flashHint(msg)
    }
  }

  function flashHint(msg: string) {
    setCopyHint(msg)
    window.setTimeout(() => setCopyHint(null), 1800)
  }

  // -- combine SSE events with snapshot.last_events for an early-fill view.
  const visibleEvents = useMemo<JobEvent[]>(() => {
    const seen = new Set<number>()
    const merged: JobEvent[] = []
    const push = (e: JobEvent) => {
      if (typeof e.seq !== "number" || seen.has(e.seq)) return
      seen.add(e.seq)
      merged.push(e)
    }
    snapshot?.last_events?.forEach(push)
    events.forEach(push)
    merged.sort((a, b) => a.seq - b.seq)
    return merged
  }, [events, snapshot])

  const streamUnavailable =
    streamError !== null && !streamOpened && events.length === 0

  const headerStatus = snapshot?.status ?? "queued"
  const startedAt = snapshot?.started_at ?? snapshot?.created_at
  const progress = snapshot?.progress
  const metrics = snapshot?.metrics
  const currentItem = snapshot?.current_item

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
        <div className="min-w-0 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <JobStatusBadge status={headerStatus} />
            <span className="text-[13px] font-medium">{snapshot?.kind ?? "—"}</span>
            <span className="text-muted-foreground text-[12px]">
              {formatRelativeTime(startedAt)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <code className="text-muted-foreground truncate font-mono text-[11px]">
              {jobId}
            </code>
            <Button
              type="button"
              size="xs"
              variant="ghost"
              onClick={handleCopyId}
              aria-label="Copy job id"
            >
              <HugeiconsIcon icon={Copy01Icon} strokeWidth={1.5} />
              Copy ID
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isActive ? (
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending || snapshot?.cancel_requested}
            >
              {snapshot?.cancel_requested ? "Cancelling…" : "Cancel job"}
            </Button>
          ) : null}
          <DialogPrimitive.Close asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Close drawer">
              <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
            </Button>
          </DialogPrimitive.Close>
        </div>
      </div>

      {/* Snapshot */}
      <div className="flex flex-col gap-3 px-5 py-4">
        {snapshotQuery.isLoading ? (
          <div className="text-muted-foreground text-[12px]">Loading snapshot…</div>
        ) : snapshotQuery.isError ? (
          <div className="text-destructive text-[12px]">
            Couldn’t load snapshot. {(snapshotQuery.error as Error | undefined)?.message}
          </div>
        ) : (
          <>
            {progress ? (
              <div className="flex flex-col gap-1.5">
                <div className="text-muted-foreground flex items-center justify-between text-[11px]">
                  <span>Progress</span>
                  <span className="font-mono">
                    {progress.done}/{progress.total}
                    {typeof progress.eta_seconds === "number" ? (
                      <span className="text-muted-foreground">
                        {" "}
                        · ETA {formatEtaSeconds(progress.eta_seconds)}
                      </span>
                    ) : null}
                  </span>
                </div>
                <JobProgressBar done={progress.done} total={progress.total} />
              </div>
            ) : null}

            {currentItem?.name || currentItem?.place_id ? (
              <div className="text-[12px]">
                <span className="text-muted-foreground">Current: </span>
                <span className="font-medium">
                  {currentItem.name ?? currentItem.place_id}
                </span>
              </div>
            ) : null}

            {metrics ? <MetricsGrid metrics={metrics} /> : null}

            {snapshot?.error ? (
              <div className="text-destructive rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12px]">
                {snapshot.error}
              </div>
            ) : null}
          </>
        )}
      </div>

      <Separator />

      {/* Stream controls */}
      <div className="flex items-center justify-between gap-2 px-5 py-3">
        <div className="text-muted-foreground text-[11px]">
          Event stream
          {streamOpened ? (
            <span className="ml-1 text-emerald-500">· live</span>
          ) : streamUnavailable ? null : (
            <span className="ml-1">· connecting…</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {copyHint ? (
            <span className="text-muted-foreground text-[11px]">{copyHint}</span>
          ) : null}
          <Select value={level} onValueChange={(v) => setLevel(v as LevelFilter)}>
            <SelectTrigger size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warn">Warn</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Event stream */}
      <div className="min-h-0 flex-1 overflow-hidden border-t">
        {streamUnavailable ? (
          <div className="text-muted-foreground px-5 py-6 text-[12px] italic">
            Event stream unavailable (backend offline)
          </div>
        ) : (
          <AiEventStream
            events={visibleEvents}
            levelFilter={level}
            mode="stream"
            autoScroll
            onExport={handleExport}
            className="h-full"
            emptyHint="Waiting for events…"
          />
        )}
      </div>
    </>
  )
}

// -----------------------------------------------------------------------------
// Metrics grid
// -----------------------------------------------------------------------------

function MetricsGrid({ metrics }: { metrics: NonNullable<JobSnapshot["metrics"]> }) {
  const cells: Array<{ label: string; value: string }> = []

  if (typeof metrics.items_per_minute === "number") {
    cells.push({
      label: "items/min",
      value: metrics.items_per_minute.toFixed(1),
    })
  }
  if (typeof metrics.avg_item_duration_ms === "number") {
    cells.push({
      label: "avg item",
      value: `${Math.round(metrics.avg_item_duration_ms)}ms`,
    })
  }
  if (typeof metrics.ai_calls === "number") {
    cells.push({ label: "AI calls", value: String(metrics.ai_calls) })
  }
  if (
    typeof metrics.tokens_in === "number" ||
    typeof metrics.tokens_out === "number"
  ) {
    cells.push({
      label: "tokens",
      value: `${metrics.tokens_in ?? 0}→${metrics.tokens_out ?? 0}`,
    })
  }
  if (typeof metrics.estimated_cost_usd === "number") {
    cells.push({
      label: "cost",
      value: `$${metrics.estimated_cost_usd.toFixed(4)}`,
    })
  }
  if (typeof metrics.errors === "number" && metrics.errors > 0) {
    cells.push({ label: "errors", value: String(metrics.errors) })
  }
  if (typeof metrics.warnings === "number" && metrics.warnings > 0) {
    cells.push({ label: "warnings", value: String(metrics.warnings) })
  }

  if (cells.length === 0) return null

  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
      {cells.map((c) => (
        <div key={c.label} className="flex items-center justify-between gap-2">
          <dt className="text-muted-foreground text-[11px]">{c.label}</dt>
          <dd className="font-mono text-[12px]">{c.value}</dd>
        </div>
      ))}
    </dl>
  )
}

// Re-export for callers that need the level type.
export type { LevelFilter }
