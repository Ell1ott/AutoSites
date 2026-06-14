"use client"

import { cn } from "@/lib/utils"
import type { Flow2LeadState, Flow2Node } from "@/lib/lead-flow-2"

export const FLOW2_NODE_W = 220
export const FLOW2_NODE_H = 132

const STATE_STYLES: Record<Flow2LeadState, { label: string; chip: string }> = {
  complete: { label: "done", chip: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  ready: { label: "ready", chip: "bg-sky-500/15 text-sky-600 dark:text-sky-400" },
  blocked: { label: "blocked", chip: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  errored: { label: "error", chip: "bg-red-500/15 text-red-600 dark:text-red-400" },
  ineligible: { label: "n/a", chip: "bg-muted text-muted-foreground" },
}

const CHIP_ORDER: Flow2LeadState[] = [
  "complete",
  "ready",
  "blocked",
  "errored",
  "ineligible",
]

const KIND_BADGE: Record<Flow2Node["kind"], string> = {
  source: "Source",
  artifact: "Artifact",
  task: "AI task",
  branch: "Branch",
}

export function Flow2NodeCard({
  node,
  selected,
}: {
  node: Flow2Node
  selected: boolean
}) {
  const isActive = node.activeJobIds.length > 0
  const topBlocker = node.blockers[0]

  return (
    <div
      style={{ width: FLOW2_NODE_W, height: FLOW2_NODE_H }}
      className={cn(
        "flex flex-col gap-1.5 overflow-hidden rounded-lg border bg-card p-2.5 text-left shadow-sm transition-colors",
        "hover:border-primary/60",
        selected ? "border-primary ring-2 ring-primary/30" : "border-border",
        !node.enabled && "opacity-50",
        node.kind === "branch" && "border-dashed bg-muted/40",
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <span className="truncate text-[13px] font-semibold leading-tight text-foreground">
          {node.label}
        </span>
        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
          {KIND_BADGE[node.kind]}
        </span>
      </div>

      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        {node.outputField ? (
          <span className="truncate font-mono">{node.outputField}</span>
        ) : null}
        {node.jobKind ? (
          <span className="shrink-0 rounded bg-accent px-1 py-px font-mono">
            {node.jobKind}
          </span>
        ) : null}
      </div>

      <div className="mt-auto flex flex-wrap gap-1">
        {CHIP_ORDER.filter((s) => node.counts[s] > 0).map((s) => (
          <span
            key={s}
            className={cn(
              "rounded px-1.5 py-0.5 text-[10px] font-medium tabular-nums",
              STATE_STYLES[s].chip,
            )}
          >
            {node.counts[s]} {STATE_STYLES[s].label}
          </span>
        ))}
        {node.counts.total === 0 ? (
          <span className="text-[10px] text-muted-foreground">no leads</span>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-1 text-[10px]">
        {topBlocker ? (
          <span className="truncate text-amber-600 dark:text-amber-400">
            {topBlocker.count} need {topBlocker.label.toLowerCase()}
          </span>
        ) : (
          <span />
        )}
        {isActive ? (
          <span className="flex shrink-0 items-center gap-1 text-sky-600 dark:text-sky-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
            running
          </span>
        ) : null}
      </div>
    </div>
  )
}
