"use client"

import Link from "next/link"
import { HugeiconsIcon } from "@hugeicons/react"
import { Cancel01Icon, PlayIcon, Loading03Icon } from "@hugeicons/core-free-icons"

import type { Flow2LeadState, Flow2Node } from "@/lib/lead-flow-2"
import type { SlimLead } from "@/lib/types"
import { cn } from "@/lib/utils"

const STATE_LABEL: Record<Flow2LeadState, string> = {
  complete: "Done",
  ready: "Ready",
  blocked: "Blocked",
  errored: "Errored",
  ineligible: "Not applicable",
}

const STATE_DOT: Record<Flow2LeadState, string> = {
  complete: "bg-emerald-500",
  ready: "bg-sky-500",
  blocked: "bg-amber-500",
  errored: "bg-red-500",
  ineligible: "bg-muted-foreground",
}

export type Flow2NodePanelProps = {
  node: Flow2Node
  leadsById: Map<string, SlimLead>
  running: boolean
  force: boolean
  onForceChange: (force: boolean) => void
  onRun: (node: Flow2Node, force: boolean) => void
  onClose: () => void
}

export function Flow2NodePanel({
  node,
  leadsById,
  running,
  force,
  onForceChange,
  onRun,
  onClose,
}: Flow2NodePanelProps) {
  const c = node.counts
  const states: Flow2LeadState[] = [
    "complete",
    "ready",
    "blocked",
    "errored",
    "ineligible",
  ]
  const runTargetCount = force
    ? node.rerunnableLeadIds.length
    : node.readyLeadIds.length
  const canRun = !!node.run && node.enabled && runTargetCount > 0

  // A small sample of affected leads (ready first, then blocked, then errored).
  const sampleIds = [
    ...node.leadIdsByState.ready,
    ...node.leadIdsByState.blocked,
    ...node.leadIdsByState.errored,
    ...node.leadIdsByState.complete,
  ].slice(0, 8)

  return (
    <aside className="flex h-full w-[320px] shrink-0 flex-col border-l border-border bg-card">
      <div className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold text-foreground">
            {node.label}
          </div>
          {node.outputField && (
            <div className="truncate font-mono text-[11px] text-muted-foreground">
              {node.outputField}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-muted-foreground hover:bg-accent/50 hover:text-foreground"
          aria-label="Close panel"
        >
          <HugeiconsIcon icon={Cancel01Icon} size={15} />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-3">
        {/* Counts */}
        <div>
          <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Lead counts
          </div>
          <div className="space-y-1">
            {states
              .filter((s) => c[s] > 0)
              .map((s) => (
                <div
                  key={s}
                  className="flex items-center justify-between text-[12px]"
                >
                  <span className="flex items-center gap-1.5 text-foreground">
                    <span className={cn("h-2 w-2 rounded-full", STATE_DOT[s])} />
                    {STATE_LABEL[s]}
                  </span>
                  <span className="font-medium tabular-nums text-foreground">
                    {c[s]}
                  </span>
                </div>
              ))}
            {c.total === 0 && (
              <p className="text-[12px] text-muted-foreground">No leads.</p>
            )}
          </div>
        </div>

        {/* Blockers */}
        {node.blockers.length > 0 && (
          <div>
            <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Top blockers
            </div>
            <div className="space-y-1">
              {node.blockers.map((b) => (
                <div
                  key={b.key}
                  className="flex items-center justify-between text-[12px]"
                >
                  <span className="text-foreground">{b.label}</span>
                  <span className="font-medium tabular-nums text-amber-600 dark:text-amber-400">
                    {b.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filter links */}
        {Object.keys(node.links).length > 0 && (
          <div>
            <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Open in leads
            </div>
            <div className="flex flex-wrap gap-1.5">
              {states
                .filter((s) => node.links[s])
                .map((s) => (
                  <Link
                    key={s}
                    href={node.links[s]!}
                    className="rounded-md border border-border px-2 py-1 text-[11px] text-foreground hover:bg-accent/50"
                  >
                    {STATE_LABEL[s]} ({c[s]})
                  </Link>
                ))}
            </div>
          </div>
        )}

        {/* Sample leads */}
        {sampleIds.length > 0 && (
          <div>
            <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Sample leads
            </div>
            <div className="space-y-0.5">
              {sampleIds.map((id) => (
                <Link
                  key={id}
                  href={`/leads/${id}`}
                  className="block truncate text-[12px] text-foreground hover:text-primary"
                  title={leadsById.get(id)?.name ?? id}
                >
                  {leadsById.get(id)?.name ?? id}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Run controls */}
      {node.run && (
        <div className="space-y-2 border-t border-border px-4 py-3">
          {node.run.supportsForce && (
            <label className="flex items-center gap-2 text-[12px] text-foreground">
              <input
                type="checkbox"
                checked={force}
                onChange={(e) => onForceChange(e.target.checked)}
                className="h-3.5 w-3.5 accent-primary"
              />
              Re-run completed leads ({node.rerunnableLeadIds.length})
            </label>
          )}
          <button
            type="button"
            disabled={!canRun || running}
            onClick={() => onRun(node, force)}
            className={cn(
              "flex w-full items-center justify-center gap-1.5 rounded-md px-2 py-2 text-[12px] font-medium transition-colors",
              canRun && !running
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "cursor-not-allowed bg-muted text-muted-foreground",
            )}
          >
            <HugeiconsIcon
              icon={running ? Loading03Icon : PlayIcon}
              size={14}
              className={running ? "animate-spin" : undefined}
            />
            {running
              ? "Starting…"
              : runTargetCount > 0
                ? `Run on ${runTargetCount} lead${runTargetCount === 1 ? "" : "s"}`
                : "Nothing to run"}
          </button>
        </div>
      )}
    </aside>
  )
}
