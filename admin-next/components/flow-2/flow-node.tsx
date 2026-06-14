"use client"

import { memo } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { PlayIcon, Loading03Icon } from "@hugeicons/core-free-icons"

import type { Flow2LeadState, Flow2Node } from "@/lib/lead-flow-2"
import { cn } from "@/lib/utils"

/** Fixed per-kind heights so the parent can anchor SVG edges precisely. */
export const NODE_HEIGHTS: Record<Flow2Node["kind"], number> = {
  source: 92,
  artifact: 150,
  task: 196,
  branch: 80,
}

export const NODE_WIDTH = 232

const STATE_CHIP: Record<Flow2LeadState, { label: string; cls: string }> = {
  complete: {
    label: "done",
    cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },
  ready: { label: "ready", cls: "bg-sky-500/15 text-sky-600 dark:text-sky-400" },
  blocked: {
    label: "blocked",
    cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  },
  errored: { label: "errored", cls: "bg-red-500/15 text-red-600 dark:text-red-400" },
  ineligible: { label: "n/a", cls: "bg-muted text-muted-foreground" },
}

const KIND_BADGE: Record<Flow2Node["kind"], string> = {
  source: "Source",
  artifact: "Artifact",
  task: "AI task",
  branch: "Branch",
}

function Chip({ state, value }: { state: Flow2LeadState; value: number }) {
  const meta = STATE_CHIP[state]
  return (
    <span
      className={cn(
        "flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium tabular-nums",
        meta.cls,
      )}
    >
      <span>{value}</span>
      <span className="opacity-70">{meta.label}</span>
    </span>
  )
}

export type Flow2NodeCardProps = {
  node: Flow2Node
  selected: boolean
  running: boolean
  onSelect: (node: Flow2Node) => void
  onRun: (node: Flow2Node) => void
}

function Flow2NodeCardInner({
  node,
  selected,
  running,
  onSelect,
  onRun,
}: Flow2NodeCardProps) {
  const c = node.counts
  const isActive = node.activeJobIds.length > 0
  const canRun = !!node.run && node.readyLeadIds.length > 0 && node.enabled
  const isBranch = node.kind === "branch"

  // Which count chips to surface, in a stable priority order.
  const chipStates: Flow2LeadState[] = isBranch
    ? []
    : (["complete", "ready", "blocked", "errored", "ineligible"] as const).filter(
        (s) => c[s] > 0,
      )

  return (
    <button
      type="button"
      onClick={() => onSelect(node)}
      style={{ width: NODE_WIDTH, height: NODE_HEIGHTS[node.kind] }}
      className={cn(
        "flex flex-col rounded-lg border bg-card p-2.5 text-left shadow-sm transition-colors",
        selected
          ? "border-primary ring-1 ring-primary"
          : "border-border hover:border-primary/40",
        !node.enabled && "opacity-60",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div
            className="truncate text-[12px] font-semibold text-foreground"
            title={node.label}
          >
            {node.label}
          </div>
          {node.outputField && (
            <div className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
              {node.outputField}
            </div>
          )}
        </div>
        <span className="flex shrink-0 items-center gap-1">
          {isActive && (
            <span
              className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-500"
              title={`${node.activeJobIds.length} active job(s)`}
            />
          )}
          <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
            {KIND_BADGE[node.kind]}
          </span>
        </span>
      </div>

      {isBranch ? (
        <div className="mt-2 text-[20px] font-bold tabular-nums text-foreground">
          {c.complete}
          <span className="ml-1 text-[11px] font-normal text-muted-foreground">
            leads
          </span>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap gap-1">
          {chipStates.length > 0 ? (
            chipStates.map((s) => <Chip key={s} state={s} value={c[s]} />)
          ) : (
            <span className="text-[11px] text-muted-foreground">No leads</span>
          )}
        </div>
      )}

      {node.blockers.length > 0 && (
        <div className="mt-auto pt-2 text-[10px] text-muted-foreground">
          <span className="font-medium uppercase tracking-wide">Why blocked</span>
          <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5">
            {node.blockers.slice(0, 3).map((b) => (
              <span key={b.key}>
                <span className="font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                  {b.count}
                </span>{" "}
                {b.label}
              </span>
            ))}
            {node.blockers.length > 3 && (
              <span className="opacity-70">+{node.blockers.length - 3} more</span>
            )}
          </div>
        </div>
      )}

      {node.run && (
        <div
          className={cn(node.blockers.length > 0 ? "mt-2" : "mt-auto pt-2")}
          role="presentation"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            disabled={!canRun || running}
            onClick={() => onRun(node)}
            className={cn(
              "flex w-full items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors",
              canRun && !running
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "cursor-not-allowed bg-muted text-muted-foreground",
            )}
          >
            <HugeiconsIcon
              icon={running ? Loading03Icon : PlayIcon}
              size={13}
              className={running ? "animate-spin" : undefined}
            />
            {running
              ? "Starting…"
              : canRun
                ? `Run on ${node.readyLeadIds.length}`
                : "Nothing ready"}
          </button>
        </div>
      )}
    </button>
  )
}

export const Flow2NodeCard = memo(Flow2NodeCardInner)
