"use client"

import { useMemo, useState } from "react"

import { Checkbox } from "@/components/ui/checkbox"
import { Flow2Graph } from "@/components/flow-2/flow-2-graph"
import { Flow2DetailPanel } from "@/components/flow-2/flow-2-detail-panel"
import { useFlow2 } from "@/hooks/use-flow-2"
import type { Flow2Node } from "@/lib/lead-flow-2"

export default function Flow2Page() {
  const [includeDisabled, setIncludeDisabled] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { snapshot, isPending, isError, error } = useFlow2({
    includeDisabledTasks: includeDisabled,
  })

  const selected = useMemo<Flow2Node | null>(() => {
    if (!snapshot || !selectedId) return null
    return snapshot.nodes.find((n) => n.id === selectedId) ?? null
  }, [snapshot, selectedId])

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h1 className="text-sm font-semibold text-foreground">Flow 2</h1>
          <p className="text-[11px] text-muted-foreground">
            {snapshot
              ? `${snapshot.loadedLeads} of ${snapshot.totalLeads} leads · ${snapshot.nodes.length} steps`
              : "Lead pipeline — live operational graph"}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {snapshot && snapshot.biggestBottlenecks.length > 0 ? (
            <div className="hidden items-center gap-1.5 md:flex">
              {snapshot.biggestBottlenecks.slice(0, 3).map((b) => (
                <button
                  key={`${b.nodeId}:${b.state}`}
                  type="button"
                  onClick={() => setSelectedId(b.nodeId)}
                  className="rounded border border-border bg-card px-2 py-1 text-[10px] text-muted-foreground hover:border-primary/60"
                >
                  <span className="font-semibold tabular-nums text-foreground">
                    {b.count}
                  </span>{" "}
                  {b.state} · {b.label}
                </button>
              ))}
            </div>
          ) : null}
          <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-muted-foreground">
            <Checkbox
              checked={includeDisabled}
              onCheckedChange={(v) => setIncludeDisabled(v === true)}
            />
            Show disabled tasks
          </label>
        </div>
      </header>

      {snapshot && snapshot.warnings.length > 0 ? (
        <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-[11px] text-amber-700 dark:text-amber-400">
          {snapshot.warnings.join(" ")}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1">
        <div className="min-h-0 flex-1">
          {isPending ? (
            <div className="flex h-full items-center justify-center text-[12px] text-muted-foreground">
              Loading flow…
            </div>
          ) : isError ? (
            <div className="flex h-full items-center justify-center text-[12px] text-red-500">
              Failed to load flow{error instanceof Error ? `: ${error.message}` : ""}.
            </div>
          ) : snapshot ? (
            <Flow2Graph
              nodes={snapshot.nodes}
              edges={snapshot.edges}
              selectedId={selectedId}
              onSelect={(node) => setSelectedId(node?.id ?? null)}
            />
          ) : null}
        </div>

        {selected ? (
          <Flow2DetailPanel
            node={selected}
            leads={snapshot?.leads ?? []}
            onClose={() => setSelectedId(null)}
          />
        ) : null}
      </div>
    </div>
  )
}
