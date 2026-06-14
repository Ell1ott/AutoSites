"use client"

import { useCallback, useEffect, useMemo } from "react"
import dagre from "@dagrejs/dagre"
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
  type NodeTypes,
  useEdgesState,
  useNodesState,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"

import {
  FLOW2_NODE_H,
  FLOW2_NODE_W,
  Flow2NodeCard,
} from "@/components/flow-2/flow-2-node-card"
import type {
  Flow2Edge,
  Flow2EdgeBranchType,
  Flow2Node,
} from "@/lib/lead-flow-2"

type Flow2RFData = { flowNode: Flow2Node }
type Flow2RFNode = Node<Flow2RFData, "flow2">

const EDGE_STYLE: Record<Flow2EdgeBranchType, { stroke: string; dashed: boolean }> = {
  main: { stroke: "var(--border)", dashed: false },
  dependency: {
    stroke: "color-mix(in oklch, var(--primary) 60%, transparent)",
    dashed: false,
  },
  missing: { stroke: "oklch(0.72 0.15 75)", dashed: true },
  error: { stroke: "oklch(0.62 0.2 25)", dashed: true },
}

/** Custom node: presentational card wrapped with left/right connection handles. */
function Flow2GraphNode({ data, selected }: NodeProps<Flow2RFNode>) {
  return (
    <>
      <Handle type="target" position={Position.Left} className="!opacity-0" />
      <Flow2NodeCard node={data.flowNode} selected={selected ?? false} />
      <Handle type="source" position={Position.Right} className="!opacity-0" />
    </>
  )
}

const NODE_TYPES: NodeTypes = { flow2: Flow2GraphNode }

function layoutPositions(
  nodes: Flow2Node[],
  edges: Flow2Edge[],
): Map<string, { x: number; y: number }> {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: "LR", ranksep: 90, nodesep: 28, marginx: 24, marginy: 24 })

  for (const node of nodes) {
    g.setNode(node.id, { width: FLOW2_NODE_W, height: FLOW2_NODE_H })
  }
  for (const edge of edges) {
    if (g.hasNode(edge.from) && g.hasNode(edge.to)) g.setEdge(edge.from, edge.to)
  }

  dagre.layout(g)

  const positions = new Map<string, { x: number; y: number }>()
  for (const node of nodes) {
    const p = g.node(node.id)
    if (p) {
      positions.set(node.id, {
        x: p.x - FLOW2_NODE_W / 2,
        y: p.y - FLOW2_NODE_H / 2,
      })
    }
  }
  return positions
}

function toRFEdges(edges: Flow2Edge[]): Edge[] {
  return edges.map((edge) => {
    const style = EDGE_STYLE[edge.branchType]
    return {
      id: edge.id,
      source: edge.from,
      target: edge.to,
      label: edge.branchType === "dependency" ? undefined : edge.label,
      animated: edge.branchType === "dependency",
      style: {
        stroke: style.stroke,
        strokeWidth: 1.5,
        strokeDasharray: style.dashed ? "5 4" : undefined,
      },
    }
  })
}

export function Flow2Graph({
  nodes,
  edges,
  selectedId,
  onSelect,
}: {
  nodes: Flow2Node[]
  edges: Flow2Edge[]
  selectedId: string | null
  onSelect: (node: Flow2Node | null) => void
}) {
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<Flow2RFNode>([])
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<Edge>([])

  // Rebuild on every snapshot change. Counts/data always refresh; positions of
  // existing nodes are preserved so user drags survive background refetches,
  // while newly appeared nodes get a fresh dagre position.
  useEffect(() => {
    const positions = layoutPositions(nodes, edges)
    setRfNodes((prev) => {
      const prevPos = new Map(prev.map((n) => [n.id, n.position]))
      return nodes.map<Flow2RFNode>((node) => ({
        id: node.id,
        type: "flow2",
        position: prevPos.get(node.id) ??
          positions.get(node.id) ?? { x: 0, y: 0 },
        data: { flowNode: node },
        selected: node.id === selectedId,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      }))
    })
    setRfEdges(toRFEdges(edges))
    // selectedId handled separately below to avoid relayout on selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, setRfNodes, setRfEdges])

  // Reflect selection without rebuilding positions.
  useEffect(() => {
    setRfNodes((prev) =>
      prev.map((n) => (n.selected === (n.id === selectedId)
        ? n
        : { ...n, selected: n.id === selectedId })),
    )
  }, [selectedId, setRfNodes])

  const handleNodeClick = useCallback(
    (_: unknown, node: Flow2RFNode) => onSelect(node.data.flowNode),
    [onSelect],
  )

  const minimapColor = useMemo(
    () => (n: Flow2RFNode) => {
      const k = n.data.flowNode.kind
      if (k === "task") return "var(--primary)"
      if (k === "branch") return "oklch(0.72 0.15 75)"
      return "var(--muted-foreground)"
    },
    [],
  )

  return (
    <ReactFlow
      nodes={rfNodes}
      edges={rfEdges}
      nodeTypes={NODE_TYPES}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={handleNodeClick}
      onPaneClick={() => onSelect(null)}
      nodesConnectable={false}
      fitView
      minZoom={0.2}
      maxZoom={1.75}
      proOptions={{ hideAttribution: true }}
      className="bg-muted/20"
    >
      <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
      <Controls showInteractive={false} />
      <MiniMap pannable zoomable nodeColor={minimapColor} nodeStrokeWidth={2} />
    </ReactFlow>
  )
}
