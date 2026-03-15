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

    const edgeColor = "#94a3b8";

    return {
      id: e.id,
      source: e.from_node_id,
      target: e.to_node_id,
      type: "animated",
      style: {
        strokeDasharray:
          e.kind === "import" ? "6 3" : e.kind === "implement" ? "2 2" : undefined,
        stroke: edgeColor,
        strokeWidth: 2,
      },
      markerEnd: hasArrow
        ? { type: MarkerType.ArrowClosed, color: edgeColor }
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
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>("");


  // コード編集時にノードデータを更新
  const handleCodeChange = useCallback(
    (nodeId: string, code: string) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, code_text: code } }
            : n
        )
      );
    },
    [setNodes]
  );

  // ノード展開時にzIndexを上げる + フィットして全体表示
  const handleExpand = useCallback(
    (nodeId: string, isExpanded: boolean) => {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === nodeId) {
            return { ...n, zIndex: isExpanded ? 1000 : 0 };
          }
          return n.zIndex === 1000 ? { ...n, zIndex: 999 } : n;
        })
      );
      if (isExpanded) {
        setTimeout(() => {
          fitView({ nodes: [{ id: nodeId }], padding: 2.5, duration: 300 });
        }, 50);
      }
    },
    [setNodes, fitView]
  );

  // 各ノードのエッジ数を計算
  const edgeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    edges.forEach((e) => {
      counts[e.source] = (counts[e.source] ?? 0) + 1;
      counts[e.target] = (counts[e.target] ?? 0) + 1;
    });
    return counts;
  }, [edges]);

  // コールバック・エッジ数をノードデータに注入
  const nodesWithCallbacks = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        data: { ...n.data, onCodeChange: handleCodeChange, onExpand: handleExpand, edgeCount: edgeCounts[n.id] ?? 0 },
      })),
    [nodes, handleCodeChange, handleExpand, edgeCounts]
  );

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

  // ファイル選択 → CodeViewerWindow を開く（1つだけ）+ そのファイルのノードにフィット
  const handleFileSelect = useCallback(
    (filePath: string) => {
      setOpenTabs((prev) =>
        prev.includes(filePath) ? prev : [...prev, filePath]
      );
      setActiveTab(filePath);
      const ids = nodes
        .filter((n) => (n.data as unknown as BoardNode).file_path === filePath)
        .map((n) => n.id);
      if (ids.length > 0) {
        fitView({ nodes: ids.map((id) => ({ id })), padding: 0.3, duration: 500 });
      }
    },
    [nodes, fitView]
  );

  const miniMapNodeColor = useCallback((node: Node) => {
    const data = node.data as unknown as BoardNode & Record<string, unknown>;
    if (data.highlighted) return "#facc15";
    const colorMap: Record<string, string> = {
      function: "#3b82f6",
      method: "#10b981",
      interface: "#a855f7",
      group: "#f59e0b",
      note: "#eab308",
      image: "#ec4899",
    };
    return colorMap[data.kind] ?? "#94a3b8";
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
        nodes={nodesWithCallbacks}
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
      />

      {/* ファイル全体表示ウィンドウ（タブ式） */}
      {openTabs.length > 0 && (
        <CodeViewerWindow
          tabs={openTabs.map((fp) => ({
            filePath: fp,
            nodes: nodes
              .map((n) => n.data as unknown as BoardNode)
              .filter((n) => n.file_path === fp),
          }))}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onTabClose={(fp) => {
            setOpenTabs((prev) => {
              const next = prev.filter((f) => f !== fp);
              if (activeTab === fp) {
                setActiveTab(next[next.length - 1] ?? "");
              }
              return next;
            });
          }}
          onCloseAll={() => {
            setOpenTabs([]);
            setActiveTab("");
          }}
          onNodeHover={handleNodeHover}
          onNodeClick={(nodeId) =>
            fitView({ nodes: [{ id: nodeId }], padding: 2.5, duration: 500 })
          }
        />
      )}
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
