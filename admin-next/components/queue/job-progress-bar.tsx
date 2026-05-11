"use client"

import { cn } from "@/lib/utils"

type Props = {
  done?: number
  total?: number
  className?: string
  /** Show the "N/T" label inline next to the bar. */
  showLabel?: boolean
}

export function JobProgressBar({ done = 0, total = 0, className, showLabel = false }: Props) {
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="bg-muted relative block h-1 flex-1 overflow-hidden rounded-full">
        <span
          className="bg-primary absolute left-0 top-0 h-full transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </span>
      {showLabel ? (
        <span className="text-muted-foreground shrink-0 font-mono text-[11px]">
          {done}/{total}
        </span>
      ) : null}
    </div>
  )
}
