"use client";

import { useCallback, useState, useMemo, useRef } from "react";
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

  const zMax = useRef(0);

  const [fileTreeOpen, setFileTreeOpen] = useState(false);
  const windowZMax = useRef(9999);
  const [windowZIndexes, setWindowZIndexes] = useState<Record<number, number>>({});

  // 複数ウィンドウ管理: 各ウィンドウが独自のタブ配列とactiveTabを持つ
  interface ViewerWindow {
    id: number;
    tabs: string[];
    activeTab: string;
  }
  const windowIdCounter = useRef(0);
  const [viewerWindows, setViewerWindows] = useState<ViewerWindow[]>([]);


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
      if (isExpanded) {
        zMax.current += 1;
        const z = zMax.current;
        setNodes((nds) =>
          nds.map((n) => (n.id === nodeId ? { ...n, zIndex: z } : n))
        );
        setTimeout(() => {
          fitView({ nodes: [{ id: nodeId }], padding: 2.5, duration: 300 });
        }, 50);
      } else {
        setNodes((nds) =>
          nds.map((n) => (n.id === nodeId ? { ...n, zIndex: 0 } : n))
        );
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

  // ハイライト状態を setNodes で直接更新 + ホバー中は仮にzMax+1
  const hoverPrevZ = useRef<{ id: string; z: number } | null>(null);
  const handleNodeHover = useCallback(
    (nodeId: string | null) => {
      setNodes((nds) => {
        // 前回ホバーしていたノードのzIndexを復元
        let restored = nds;
        if (hoverPrevZ.current) {
          const prev = hoverPrevZ.current;
          restored = nds.map((n) =>
            n.id === prev.id ? { ...n, zIndex: prev.z } : n
          );
        }

        if (nodeId) {
          const target = restored.find((n) => n.id === nodeId);
          hoverPrevZ.current = { id: nodeId, z: target?.zIndex ?? 0 };
          return restored.map((n) => ({
            ...n,
            data: { ...n.data, highlighted: n.id === nodeId },
            zIndex: n.id === nodeId ? zMax.current + 1 : n.zIndex,
          }));
        } else {
          hoverPrevZ.current = null;
          return restored.map((n) => ({
            ...n,
            data: { ...n.data, highlighted: false },
          }));
        }
      });
    },
    [setNodes]
  );

  // ファイル選択 → 最初のウィンドウにタブ追加（なければ新規ウィンドウ作成）
  const handleFileSelect = useCallback(
    (filePath: string) => {
      setViewerWindows((prev) => {
        if (prev.length === 0) {
          windowIdCounter.current += 1;
          return [{ id: windowIdCounter.current, tabs: [filePath], activeTab: filePath }];
        }
        // 既にどこかのウィンドウに開いていたらそこをアクティブに
        const existing = prev.find((w) => w.tabs.includes(filePath));
        if (existing) {
          return prev.map((w) =>
            w.id === existing.id ? { ...w, activeTab: filePath } : w
          );
        }
        // 最初のウィンドウにタブ追加
        return prev.map((w, i) =>
          i === 0 ? { ...w, tabs: [...w.tabs, filePath], activeTab: filePath } : w
        );
      });
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

      {/* ファイル全体表示ウィンドウ（複数ウィンドウ対応） */}
      {viewerWindows.map((win, idx) => (
        <CodeViewerWindow
          key={win.id}
          zIndex={windowZIndexes[win.id] ?? 9999}
          onFocus={() => {
            windowZMax.current += 1;
            setWindowZIndexes((prev) => ({ ...prev, [win.id]: windowZMax.current }));
          }}
          tabs={win.tabs.map((fp) => ({
            filePath: fp,
            nodes: nodes
              .map((n) => n.data as unknown as BoardNode)
              .filter((n) => n.file_path === fp),
          }))}
          activeTab={win.activeTab}
          initialPosition={{
            x: typeof window !== "undefined" ? Math.max(100, window.innerWidth - 600 - idx * 40) : 100,
            y: 80 + idx * 40,
          }}
          onTabChange={(fp) => {
            setViewerWindows((prev) =>
              prev.map((w) => (w.id === win.id ? { ...w, activeTab: fp } : w))
            );
          }}
          onTabClose={(fp) => {
            setViewerWindows((prev) => {
              const updated = prev.map((w) => {
                if (w.id !== win.id) return w;
                const next = w.tabs.filter((t) => t !== fp);
                const nextActive = w.activeTab === fp ? (next[next.length - 1] ?? "") : w.activeTab;
                return { ...w, tabs: next, activeTab: nextActive };
              });
              return updated.filter((w) => w.tabs.length > 0);
            });
          }}
          onCloseAll={() => {
            setViewerWindows((prev) => prev.filter((w) => w.id !== win.id));
          }}
          onDetachTab={(fp) => {
            setViewerWindows((prev) => {
              windowIdCounter.current += 1;
              const newWin: ViewerWindow = {
                id: windowIdCounter.current,
                tabs: [fp],
                activeTab: fp,
              };
              const updated = prev.map((w) => {
                if (w.id !== win.id) return w;
                const next = w.tabs.filter((t) => t !== fp);
                const nextActive = w.activeTab === fp ? (next[next.length - 1] ?? "") : w.activeTab;
                return { ...w, tabs: next, activeTab: nextActive };
              });
              return [...updated.filter((w) => w.tabs.length > 0), newWin];
            });
          }}
          onNodeHover={handleNodeHover}
          onNodeClick={(nodeId) => {
            zMax.current += 1;
            const z = zMax.current;
            if (hoverPrevZ.current?.id === nodeId) {
              hoverPrevZ.current.z = z;
            }
            setNodes((nds) =>
              nds.map((n) => (n.id === nodeId ? { ...n, zIndex: z } : n))
            );
            fitView({ nodes: [{ id: nodeId }], padding: 2.5, duration: 500 });
          }}
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
