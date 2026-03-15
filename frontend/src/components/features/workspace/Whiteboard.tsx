"use client";

import { useCallback, useState, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
  type NodeTypes,
  type EdgeTypes,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { BoardNode, BoardEdge } from "@/types/type";
import { CodeCard } from "./CodeCard";
import { AnimatedEdge } from "./AnimatedEdge";
import { FileTreePanel } from "./FileTreePanel";
import { CodeViewerWindow } from "./CodeViewerWindow";
import { FolderTree } from "lucide-react";

interface WhiteboardProps {
  boardNodes: BoardNode[];
  boardEdges: BoardEdge[];
}

const nodeTypes: NodeTypes = {
  codeCard: CodeCard,
};

const edgeTypes: EdgeTypes = {
  animated: AnimatedEdge,
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
      type: "animated",
      style: {
        strokeDasharray: e.style === "dashed" ? "6 3" : undefined,
        stroke: edgeColors[e.kind] ?? "#94a3b8",
        strokeWidth: 2,
      },
      markerEnd: hasArrow
        ? { type: MarkerType.ArrowClosed, color: edgeColors[e.kind] }
        : undefined,
    };
  });
}

function WhiteboardInner({ boardNodes, boardEdges }: WhiteboardProps) {
  const initialNodes = useMemo(() => toFlowNodes(boardNodes), [boardNodes]);
  const initialEdges = useMemo(() => toFlowEdges(boardEdges), [boardEdges]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);
  const { fitView } = useReactFlow();

  const [fileTreeOpen, setFileTreeOpen] = useState(false);
  const [openFiles, setOpenFiles] = useState<string[]>([]);

  // ハイライト状態を setNodes で直接更新
  const handleNodeHover = useCallback(
    (nodeId: string | null) => {
      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          data: { ...n.data, highlighted: n.id === nodeId },
        }))
      );
    },
    [setNodes]
  );

  // ファイル選択 → CodeViewerWindow を開く + そのファイルのノードにフィット
  const handleFileSelect = useCallback(
    (filePath: string) => {
      setOpenFiles((prev) =>
        prev.includes(filePath) ? prev : [...prev, filePath]
      );
      const ids = nodes
        .filter((n) => (n.data as unknown as BoardNode).file_path === filePath)
        .map((n) => n.id);
      if (ids.length > 0) {
        fitView({ nodes: ids.map((id) => ({ id })), padding: 0.3, duration: 500 });
      }
    },
    [nodes, fitView]
  );

  // ファイルツリーからノードをクリック → フォーカス
  const handleTreeNodeClick = useCallback(
    (nodeId: string) => {
      fitView({ nodes: [{ id: nodeId }], padding: 0.5, duration: 500 });
    },
    [fitView]
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

  return (
    <div className="w-full h-full relative">
      {/* ファイルツリー開閉ボタン */}
      <button
        onClick={() => setFileTreeOpen((prev) => !prev)}
        className="absolute top-4 left-4 z-40 bg-white border border-gray-200 rounded-lg p-2 shadow-md hover:bg-gray-50 transition-colors"
        title="ファイルツリー"
      >
        <FolderTree className="size-5 text-gray-700" />
      </button>

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
        <MiniMap
          nodeColor={miniMapNodeColor}
          maskColor="rgba(0,0,0,0.08)"
          pannable
          zoomable
        />
      </ReactFlow>

      {/* ファイルツリーパネル */}
      <FileTreePanel
        nodes={boardNodes}
        isOpen={fileTreeOpen}
        onClose={() => setFileTreeOpen(false)}
        onFileSelect={handleFileSelect}
        onNodeHover={handleNodeHover}
        onNodeClick={handleTreeNodeClick}
      />

      {/* ファイル全体表示ウィンドウ（複数同時表示） */}
      {openFiles.map((fp) => (
        <CodeViewerWindow
          key={fp}
          filePath={fp}
          nodes={boardNodes.filter((n) => n.file_path === fp)}
          onClose={() =>
            setOpenFiles((prev) => prev.filter((f) => f !== fp))
          }
          onNodeHover={handleNodeHover}
        />
      ))}
    </div>
  );
}

// useReactFlow を使うために Provider でラップ
export function Whiteboard(props: WhiteboardProps) {
  return (
    <ReactFlowProvider>
      <WhiteboardInner {...props} />
    </ReactFlowProvider>
  );
}
