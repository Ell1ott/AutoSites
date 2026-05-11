"use client"

import Link from "next/link"

import { HugeiconsIcon } from "@hugeicons/react"
import { WorkflowSquare05Icon } from "@hugeicons/core-free-icons"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { JobProgressBar } from "@/components/queue/job-progress-bar"
import { JobStatusBadge } from "@/components/queue/job-status-badge"
import { useJobs } from "@/hooks/use-jobs"
import { cn } from "@/lib/utils"

export function QueueIndicator() {
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
            "inline-flex h-8 items-center gap-1.5 rounded px-2 text-[13px] transition-colors hover:text-foreground",
            count === 0 ? "text-muted-foreground" : "text-foreground",
          )}
        >
          <HugeiconsIcon icon={WorkflowSquare05Icon} size={14} strokeWidth={1.5} />
          <span>Queue</span>
          <span
            className={cn(
              "tabular-nums",
              count === 0 ? "text-muted-foreground" : "text-primary",
            )}
          >
            ({count})
          </span>
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
