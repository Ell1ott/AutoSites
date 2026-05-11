"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { JobStatus } from "@/lib/types"

const STATUS_STYLES: Record<JobStatus, string> = {
  queued: "bg-muted text-foreground/70",
  running: "bg-primary/15 text-primary",
  done: "bg-emerald-500/15 text-emerald-500",
  failed: "bg-destructive/15 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
}

export function JobStatusBadge({
  status,
  className,
}: {
  status: JobStatus
  className?: string
}) {
  return (
    <Badge
      variant="outline"
      className={cn("border-transparent", STATUS_STYLES[status], className)}
    >
      {status}
    </Badge>
  )
}
