"use client"

import Link from "next/link"

import { HugeiconsIcon } from "@hugeicons/react"
import { WorkflowSquare05Icon } from "@hugeicons/core-free-icons"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { JobProgressBar } from "@/components/queue/job-progress-bar"
import { JobStatusBadge } from "@/components/queue/job-status-badge"
import { useJobs } from "@/hooks/use-jobs"
import { cn } from "@/lib/utils"

export function QueueIndicator({ compact = false }: { compact?: boolean }) {
  const { data: jobs = [] } = useJobs(["running", "queued"])
  const count = jobs.length
  const top = jobs.slice(0, 5)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Queue (${count} active)`}
          className={cn(
            "relative inline-flex items-center rounded-md text-[13px] transition-colors hover:bg-accent/50 hover:text-foreground",
            compact
              ? "mx-1 h-9 w-[calc(100%-8px)] justify-center"
              : "h-8 gap-1.5 px-2",
            count === 0 ? "text-muted-foreground" : "text-foreground",
          )}
        >
          <HugeiconsIcon icon={WorkflowSquare05Icon} size={16} strokeWidth={1.5} />
          {!compact ? (
            <>
              <span>Queue</span>
              <span
                className={cn(
                  "tabular-nums",
                  count === 0 ? "text-muted-foreground" : "text-primary",
                )}
              >
                ({count})
              </span>
            </>
          ) : count > 0 ? (
            <span className="absolute top-1 right-1 min-w-4 rounded-full bg-primary px-1 text-center text-[10px] leading-4 text-primary-foreground tabular-nums">
              {count}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 gap-2">
        {count === 0 ? (
          <div className="text-muted-foreground py-1 text-[13px]">
            No active jobs.
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {top.map((job) => {
              const done = job.progress?.done ?? 0
              const total = job.progress?.total ?? 0
              return (
                <li key={job.id} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex items-center gap-2">
                      <JobStatusBadge status={job.status} />
                      <span className="truncate text-[12px] font-medium">
                        {job.kind}
                      </span>
                    </div>
                    {total > 0 ? (
                      <span className="text-muted-foreground shrink-0 font-mono text-[11px]">
                        {done}/{total}
                      </span>
                    ) : null}
                  </div>
                  {total > 0 ? <JobProgressBar done={done} total={total} /> : null}
                </li>
              )
            })}
          </ul>
        )}
        <Link
          href="/queue"
          className="text-primary inline-flex items-center self-end text-[12px] font-medium hover:underline"
        >
          See all
        </Link>
      </PopoverContent>
    </Popover>
  )
}
