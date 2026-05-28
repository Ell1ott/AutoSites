"use client"

import type { ReactNode } from "react"
import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { HugeiconsIcon } from "@hugeicons/react"
import { Alert02Icon, Cancel01Icon, Queue01Icon, Search01Icon } from "@hugeicons/core-free-icons"
import type { IconSvgElement } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/shell/empty-state"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { JobProgressBar } from "@/components/queue/job-progress-bar"
import { JobStatusBadge } from "@/components/queue/job-status-badge"
import { JobDrawer } from "@/components/queue/job-drawer"
import { formatRelativeTime, formatEtaSeconds } from "@/components/queue/relative-time"
import { useJobs } from "@/hooks/use-jobs"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import type { Job } from "@/lib/types"

export default function QueuePage() {
  const [openJobId, setOpenJobId] = useState<string | null>(null)
  const [tab, setTab] = useState<"active" | "history">("active")
  const [search, setSearch] = useState("")

  const active = useJobs(["queued", "running"])
  const history = useJobs(["done", "failed", "cancelled"])

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-border flex shrink-0 items-center justify-between border-b px-5 py-3">
        <div>
          <h1 className="text-[15px] font-medium leading-none">Queue</h1>
          <p className="text-muted-foreground mt-1 text-[12px]">
            {active.data?.length ?? 0} active · {history.data?.length ?? 0} in history
          </p>
        </div>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as "active" | "history")}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="border-border flex shrink-0 items-center gap-3 border-b px-5 py-2">
          <TabsList>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
          {tab === "history" && (
            <div className="relative ml-auto w-64">
              <HugeiconsIcon
                icon={Search01Icon}
                size={14}
                strokeWidth={1.75}
                className="text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2"
              />
              <Input
                placeholder="Search by kind or id…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-7"
              />
            </div>
          )}
        </div>

        <TabsContent value="active" className="min-h-0 flex-1 overflow-auto">
          <JobList
            isLoading={active.isLoading}
            error={active.error}
            jobs={active.data ?? []}
            onOpen={setOpenJobId}
            emptyIcon={Queue01Icon}
            emptyTitle="No active jobs"
            emptyDescription="Jobs will appear here when something starts running."
          />
        </TabsContent>

        <TabsContent value="history" className="min-h-0 flex-1 overflow-auto">
          <JobList
            isLoading={history.isLoading}
            error={history.error}
            jobs={filterJobs(history.data ?? [], search)}
            onOpen={setOpenJobId}
            emptyIcon={Queue01Icon}
            emptyTitle="No completed jobs yet"
            showFinishedAt
          />
        </TabsContent>
      </Tabs>

      <JobDrawer jobId={openJobId} onClose={() => setOpenJobId(null)} />
    </div>
  )
}

function filterJobs(jobs: Job[], search: string): Job[] {
  const q = search.trim().toLowerCase()
  if (!q) return jobs
  return jobs.filter(
    (j) => j.id.toLowerCase().includes(q) || j.kind.toLowerCase().includes(q),
  )
}

type JobListProps = {
  isLoading: boolean
  error: unknown
  jobs: Job[]
  onOpen: (id: string) => void
  emptyIcon: IconSvgElement
  emptyTitle: string
  emptyDescription?: ReactNode
  showFinishedAt?: boolean
}

function JobList({
  isLoading,
  error,
  jobs,
  onOpen,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  showFinishedAt,
}: JobListProps) {
  if (isLoading) {
    return (
      <ul className="divide-border divide-y">
        {Array.from({ length: 4 }).map((_, i) => (
          <li key={i} className="px-5 py-3">
            <div className="bg-muted h-4 w-1/3 animate-pulse rounded" />
            <div className="bg-muted mt-2 h-1 w-full animate-pulse rounded" />
          </li>
        ))}
      </ul>
    )
  }
  if (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return (
      <EmptyState
        icon={Alert02Icon}
        title="Couldn't load jobs"
        description={
          <>
            {msg}. Backend at{" "}
            <code className="font-mono">NEXT_PUBLIC_PI_URL</code> reachable?
          </>
        }
      />
    )
  }
  if (jobs.length === 0) {
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyDescription}
      />
    )
  }
  return (
    <ul className="divide-border divide-y">
      {jobs.map((j) => (
        <JobRow key={j.id} job={j} onOpen={onOpen} showFinishedAt={showFinishedAt} />
      ))}
    </ul>
  )
}

type JobRowProps = { job: Job; onOpen: (id: string) => void; showFinishedAt?: boolean }

function JobRow({ job, onOpen, showFinishedAt }: JobRowProps) {
  const qc = useQueryClient()
  const cancel = useMutation({
    mutationFn: () => api.cancelJob(job.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs"] }),
  })

  const done = job.progress?.done ?? 0
  const total = job.progress?.total ?? 0
  const eta = formatEtaSeconds(job.progress?.eta_seconds)
  const canCancel = job.status === "running" || job.status === "queued"
  const timestamp = showFinishedAt ? job.finished_at ?? job.created_at : job.started_at ?? job.created_at

  return (
    <li
      role="button"
      tabIndex={0}
      onClick={() => onOpen(job.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onOpen(job.id)
        }
      }}
      className={cn(
        "hover:bg-accent/40 focus:bg-accent/40 cursor-pointer px-5 py-3 outline-none",
      )}
    >
      <div className="flex items-center gap-3">
        <JobStatusBadge status={job.status} />
        <span className="text-foreground text-[13px] font-medium">{job.kind}</span>
        {job.kind === "ai_task" &&
        typeof (job.args as { workers?: unknown })?.workers === "number" ? (
          <span
            title={`${(job.args as { workers: number }).workers}-way parallel`}
            className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10.5px] font-medium text-amber-300 ring-1 ring-amber-500/30"
          >
            ⚡ {(job.args as { workers: number }).workers}×
          </span>
        ) : null}
        <span className="text-muted-foreground font-mono text-[11px]">{job.id}</span>
        <span className="text-muted-foreground ml-auto text-[11px]">
          {formatRelativeTime(timestamp)}
        </span>
        {canCancel && (
          <Button
            variant="ghost"
            size="xs"
            onClick={(e) => {
              e.stopPropagation()
              cancel.mutate()
            }}
            disabled={cancel.isPending}
            aria-label="Cancel job"
            className="gap-1"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={12} strokeWidth={1.75} />
            Cancel
          </Button>
        )}
      </div>
      {(total > 0 || job.status === "running") && (
        <div className="mt-2 flex items-center gap-3">
          <JobProgressBar done={done} total={total} className="max-w-md flex-1" />
          <span className="text-muted-foreground font-mono text-[11px] shrink-0">
            {done}/{total}
            {eta ? ` · ETA ${eta}` : ""}
          </span>
        </div>
      )}
      {job.error && (
        <p className="text-destructive mt-1.5 text-[12px] leading-snug">
          {job.error.split("\n")[0]}
        </p>
      )}
    </li>
  )
}
