"use client"

import { useMemo } from "react"

import type { Flow2Edge, Flow2Node, Flow2Snapshot } from "@/lib/lead-flow-2"
import { cn } from "@/lib/utils"
import { Flow2NodeCard, NODE_HEIGHTS, NODE_WIDTH } from "@/components/flow-2/flow-node"

const COL_GAP = 96 // horizontal gap between columns
const ROW_GAP = 28 // vertical gap between stacked nodes in a column
const PAD = 32 // canvas padding
const COL_STEP = NODE_WIDTH + COL_GAP

type Placed = { node: Flow2Node; x: number; y: number; h: number }

const EDGE_STYLE: Record<Flow2Edge["branchType"], string> = {
  main: "var(--border)",
  dependency: "color-mix(in oklab, var(--primary) 55%, transparent)",
  missing: "color-mix(in oklab, #f59e0b 70%, transparent)",
  error: "color-mix(in oklab, #ef4444 70%, transparent)",
}

/**
 * Order nodes within a single column: the main spine (source/artifact/task)
 * first — sorted so the canonical step sits on top — then dead-end branch
 * nodes pushed to the bottom.
 */
function columnSort(a: Flow2Node, b: Flow2Node): number {
  const rank = (n: Flow2Node) => (n.kind === "branch" ? 1 : 0)
  return rank(a) - rank(b) || a.label.localeCompare(b.label)
}

function place(snapshot: Flow2Snapshot): {
  placed: Map<string, Placed>
  width: number
  height: number
} {
  // Group by lane, then remap used lanes to consecutive column indices so
  // unused lanes don't leave visual gaps.
  const byLane = new Map<number, Flow2Node[]>()
  for (const node of snapshot.nodes) {
    const arr = byLane.get(node.lane) ?? []
    arr.push(node)
    byLane.set(node.lane, arr)
  }
  const lanes = Array.from(byLane.keys()).sort((a, b) => a - b)

  // First pass: column heights so we can vertically center each column.
  const colHeights = lanes.map((lane) =>
    (byLane.get(lane) ?? []).reduce(
      (sum, n, i) => sum + NODE_HEIGHTS[n.kind] + (i > 0 ? ROW_GAP : 0),
      0,
    ),
  )
  const maxColHeight = Math.max(0, ...colHeights)

  const placed = new Map<string, Placed>()
  lanes.forEach((lane, col) => {
    const nodes = (byLane.get(lane) ?? []).slice().sort(columnSort)
    let y = PAD + (maxColHeight - colHeights[col]) / 2
    const x = PAD + col * COL_STEP
    for (const node of nodes) {
      const h = NODE_HEIGHTS[node.kind]
      placed.set(node.id, { node, x, y, h })
      y += h + ROW_GAP
    }
  })

  return {
    placed,
    width: PAD * 2 + (lanes.length - 1) * COL_STEP + NODE_WIDTH,
    height: PAD * 2 + maxColHeight,
  }
}

/** Cubic bezier from the right edge of `from` to the left edge of `to`. */
function edgePath(from: Placed, to: Placed): string {
  const x1 = from.x + NODE_WIDTH
  const y1 = from.y + from.h / 2
  const x2 = to.x
  const y2 = to.y + to.h / 2
  const dx = Math.max(40, (x2 - x1) / 2)
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`
}

export type Flow2GraphProps = {
  snapshot: Flow2Snapshot
  selectedId: string | null
  runningId: string | null
  onSelect: (node: Flow2Node) => void
  onRun: (node: Flow2Node) => void
}

export function Flow2Graph({
  snapshot,
  selectedId,
  runningId,
  onSelect,
  onRun,
}: Flow2GraphProps) {
  const { placed, width, height } = useMemo(() => place(snapshot), [snapshot])

  const edges = useMemo(
    () =>
      snapshot.edges
        .map((edge) => {
          const from = placed.get(edge.from)
          const to = placed.get(edge.to)
          if (!from || !to) return null
          return { edge, d: edgePath(from, to) }
        })
        .filter((e): e is { edge: Flow2Edge; d: string } => e !== null),
    [snapshot.edges, placed],
  )

  return (
    <div className="h-full w-full overflow-auto">
      <div className="relative" style={{ width, height }}>
        <svg
          className="absolute inset-0 pointer-events-none"
          width={width}
          height={height}
        >
          {edges.map(({ edge, d }) => (
            <path
              key={edge.id}
              d={d}
              fill="none"
              stroke={EDGE_STYLE[edge.branchType]}
              strokeWidth={edge.branchType === "main" ? 2 : 1.5}
              strokeDasharray={
                edge.branchType === "missing" || edge.branchType === "error"
                  ? "5 4"
                  : undefined
              }
            >
              <title>{edge.reason}</title>
            </path>
          ))}
        </svg>

        {Array.from(placed.values()).map(({ node, x, y }) => (
          <div
            key={node.id}
            className={cn("absolute")}
            style={{ left: x, top: y }}
          >
            <Flow2NodeCard
              node={node}
              selected={selectedId === node.id}
              running={runningId === node.id}
              onSelect={onSelect}
              onRun={onRun}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
