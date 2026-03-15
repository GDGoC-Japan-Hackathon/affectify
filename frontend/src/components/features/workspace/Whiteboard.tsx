"use client";

import { useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeTypes,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { BoardNode, BoardEdge } from "@/types/type";
import { FunctionNodeCard } from "./FunctionNodeCard";
import { AnimatedEdge } from "./AnimatedEdge";

interface WhiteboardProps {
  boardNodes: BoardNode[];
  boardEdges: BoardEdge[];
}

const nodeTypes: NodeTypes = {
  functionNodeCard: FunctionNodeCard,
};

const edgeTypes = {
  animatedEdge: AnimatedEdge,
};

function toFlowNodes(boardNodes: BoardNode[]): Node[] {
  return boardNodes.map((n) => ({
    id: n.id,
    type: "functionNodeCard",
    position: { x: n.x, y: n.y },
    data: { ...n },
  }));
}

function toFlowEdges(boardEdges: BoardEdge[]): Edge[] {
  return boardEdges.map((e) => {
    const hasArrow = e.kind === "call" || e.kind === "import";

    const edgeColors: Record<string, string> = {
      call: "#3b82f6",
      import: "#a855f7",
      implement: "#f59e0b",
    };

    return {
      id: e.id,
      source: e.from_node_id,
      target: e.to_node_id,
      type: "animatedEdge",
      style: {
        strokeDasharray: e.style === "dashed" ? "6 3" : undefined,
        stroke: edgeColors[e.kind] ?? "#94a3b8",
        strokeWidth: 2,
      },
      markerEnd: hasArrow ? { type: MarkerType.ArrowClosed, color: edgeColors[e.kind] } : undefined,
      label: e.kind,
      labelStyle: { fontSize: 10, fill: "#64748b" },
      labelBgStyle: { fill: "#f8fafc", stroke: "#e2e8f0", strokeWidth: 1 },
      labelBgPadding: [4, 2] as [number, number],
    };
  });
}

export function Whiteboard({ boardNodes, boardEdges }: WhiteboardProps) {
  const initialNodes = useMemo(() => toFlowNodes(boardNodes), [boardNodes]);
  const initialEdges = useMemo(() => toFlowEdges(boardEdges), [boardEdges]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const miniMapNodeColor = useCallback((node: Node) => {
    const kind = (node.data as unknown as BoardNode)?.kind;
    const colorMap: Record<string, string> = {
      function: "#3b82f6",
      method: "#10b981",
      interface: "#a855f7",
      group: "#f59e0b",
      note: "#eab308",
      image: "#ec4899",
    };
    return colorMap[kind] ?? "#94a3b8";
  }, []);

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={20} size={1} />
        <Controls />
        <MiniMap nodeColor={miniMapNodeColor} maskColor="rgba(0,0,0,0.08)" pannable zoomable />
      </ReactFlow>
    </div>
  );
}
