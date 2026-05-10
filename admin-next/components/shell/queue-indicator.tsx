"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import { WorkflowSquare05Icon } from "@hugeicons/core-free-icons"

// TODO(step 8): wire to GET /jobs?status=running
export function QueueIndicator() {
  return (
    <button className="inline-flex h-8 items-center gap-1.5 rounded px-2 text-[13px] text-muted-foreground hover:text-foreground transition-colors">
      <HugeiconsIcon icon={WorkflowSquare05Icon} size={14} strokeWidth={1.5} />
      <span>Queue</span>
      <span className="text-muted-foreground">(0)</span>
    </button>
  )
}
