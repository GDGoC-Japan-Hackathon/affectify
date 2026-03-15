"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
  type NodeMouseHandler,
  type NodeTypes,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { BoardNode, BoardEdge } from "@/types/type";
import { CodeCard } from "./CodeCard";
import { CodeModal } from "./CodeModal";
import { Toolbar, type ToolType } from "@/components/layout/Toolbar";

interface WhiteboardProps {
  boardNodes: BoardNode[];
  boardEdges: BoardEdge[];
}

const nodeTypes: NodeTypes = {
  codeCard: CodeCard,
};

function toFlowNodes(boardNodes: BoardNode[]): Node[] {
  return boardNodes.map((n) => ({
    id: n.id,
    type: "codeCard",
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

function WhiteboardInner({ boardNodes, boardEdges }: WhiteboardProps) {
  const initialNodes = useMemo(() => toFlowNodes(boardNodes), [boardNodes]);
  const initialEdges = useMemo(() => toFlowEdges(boardEdges), [boardEdges]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const { screenToFlowPosition } = useReactFlow();
  const noteCountRef = useRef(0);

  const [activeTool, setActiveTool] = useState<ToolType>("select");
  const [selectedNode, setSelectedNode] = useState<BoardNode | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "v" || e.key === "V") setActiveTool("select");
      if (e.key === "h" || e.key === "H") setActiveTool("hand");
      if (e.key === "n" || e.key === "N") setActiveTool("note");
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const onNodeDoubleClick: NodeMouseHandler = useCallback((_, node) => {
    setSelectedNode(node.data as unknown as BoardNode);
  }, []);

  const onCodeChange = useCallback(
    (nodeId: string, code: string) => {
      setSelectedNode((prev) => (prev && prev.id === nodeId ? { ...prev, code_text: code } : prev));
      onNodesChange([
        {
          type: "replace",
          id: nodeId,
          item: {
            ...nodes.find((n) => n.id === nodeId)!,
            data: {
              ...nodes.find((n) => n.id === nodeId)!.data,
              code_text: code,
            },
          },
        },
      ]);
    },
    [nodes, onNodesChange],
  );

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

  const onPaneClick = useCallback(
    (event: React.MouseEvent) => {
      if (activeTool !== "note") return;

      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      noteCountRef.current += 1;

      const newNote: BoardNode = {
        id: `note-${Date.now()}`,
        kind: "note",
        title: `Note ${noteCountRef.current}`,
        file_path: "",
        signature: "",
        receiver: "",
        x: position.x,
        y: position.y,
        code_text: "",
      };

      const newFlowNode: Node = {
        id: newNote.id,
        type: "codeCard",
        position: { x: newNote.x, y: newNote.y },
        data: { ...newNote },
      };

      setNodes((nds) => [...nds, newFlowNode]);
      setActiveTool("select");
    },
    [activeTool, screenToFlowPosition, setNodes],
  );

  const isHand = activeTool === "hand";

  return (
    <div className="w-full h-full relative">
      <Toolbar activeTool={activeTool} onToolChange={setActiveTool} />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDoubleClick={onNodeDoubleClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        nodesDraggable={!isHand}
        nodesConnectable={!isHand}
        elementsSelectable={!isHand}
        panOnDrag={isHand ? [0, 1, 2] : [1, 2]}
        selectionOnDrag={!isHand}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={20} size={1} />
        <MiniMap nodeColor={miniMapNodeColor} maskColor="rgba(0,0,0,0.08)" pannable zoomable />
      </ReactFlow>

      <CodeModal
        node={selectedNode}
        onClose={() => setSelectedNode(null)}
        onCodeChange={onCodeChange}
      />
    </div>
  );
}

export function Whiteboard(props: WhiteboardProps) {
  return (
    <ReactFlowProvider>
      <WhiteboardInner {...props} />
    </ReactFlowProvider>
  );
}
