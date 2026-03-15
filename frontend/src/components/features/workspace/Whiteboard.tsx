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
import { FolderTree, Focus } from "lucide-react";

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
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { fitView } = useReactFlow();

  const [focusMode, setFocusMode] = useState(false);
  const zMax = useRef(100);
  const hoverNodeId = useRef<string | null>(null);
  const hoverSavedZ = useRef<number>(0);

  // zMaxを+1してノードを最前面にする（展開・クリック・ドラッグ用）
  const bringToFront = useCallback(
    (nodeId: string) => {
      zMax.current += 1;
      const z = zMax.current;
      // ホバー中のノードなら保存値も更新（ホバー解除で戻されるのを防ぐ）
      if (hoverNodeId.current === nodeId) {
        hoverSavedZ.current = z;
      }
      setNodes((nds) =>
        nds.map((n) => (n.id === nodeId ? { ...n, zIndex: z } : n))
      );
    },
    [setNodes]
  );

  // ホバー時：zMaxは変えず仮に最前面にする。ホバー解除で元に戻す
  // フォーカスモードON時は関連しないノード/エッジを半透明にする
  const handleNodeHover = useCallback(
    (nodeId: string | null) => {
      const prevHoverId = hoverNodeId.current;
      const prevSavedZ = hoverSavedZ.current;

      // フォーカスモード: 関連ノードIDを取得
      const connectedIds = new Set<string>();
      if (focusMode && nodeId) {
        connectedIds.add(nodeId);
        edges.forEach((e) => {
          if (e.source === nodeId) connectedIds.add(e.target);
          if (e.target === nodeId) connectedIds.add(e.source);
        });
      }

      // フォーカスモード: エッジのopacity更新
      if (focusMode) {
        setEdges((eds) =>
          eds.map((e) => ({
            ...e,
            style: {
              ...e.style,
              opacity: nodeId
                ? (e.source === nodeId || e.target === nodeId ? 1 : 0.1)
                : 1,
            },
          }))
        );
      }

      setNodes((nds) => {
        // 新しいホバー先のzIndexをnds（最新state）から保存
        if (nodeId && nodeId !== prevHoverId) {
          const target = nds.find((n) => n.id === nodeId);
          hoverSavedZ.current = target?.zIndex ?? 0;
          hoverNodeId.current = nodeId;
        } else if (!nodeId) {
          hoverNodeId.current = null;
        }

        return nds.map((n) => {
          if (nodeId) {
            const isDimmed = focusMode && !connectedIds.has(n.id);
            if (n.id === nodeId) {
              return { ...n, data: { ...n.data, highlighted: true }, style: { ...n.style, opacity: 1 }, zIndex: 9999999 };
            }
            if (n.id === prevHoverId && prevHoverId !== nodeId) {
              return { ...n, data: { ...n.data, highlighted: false }, style: { ...n.style, opacity: isDimmed ? 0.15 : 1 }, zIndex: prevSavedZ };
            }
            return { ...n, data: { ...n.data, highlighted: false }, style: { ...n.style, opacity: isDimmed ? 0.15 : 1 } };
          } else {
            if (n.id === prevHoverId) {
              return { ...n, data: { ...n.data, highlighted: false }, style: { ...n.style, opacity: 1 }, zIndex: prevSavedZ };
            }
            return { ...n, data: { ...n.data, highlighted: false }, style: { ...n.style, opacity: 1 } };
          }
        });
      });
    },
    [setNodes, setEdges, edges, focusMode]
  );

  const [fileTreeOpen, setFileTreeOpen] = useState(false);
  const windowZMax = useRef(9999);
  const [windowZIndexes, setWindowZIndexes] = useState<Record<number, number>>({});

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
        bringToFront(nodeId);
        setTimeout(() => {
          fitView({ nodes: [{ id: nodeId }], padding: 2.5, duration: 300 });
        }, 50);
      } else {
        setNodes((nds) =>
          nds.map((n) => (n.id === nodeId ? { ...n, zIndex: 0 } : n))
        );
      }
    },
    [setNodes, fitView, bringToFront]
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

      <button
        onClick={() => setFocusMode((prev) => !prev)}
        className={`absolute top-4 left-16 z-40 border rounded-lg p-2 shadow-md transition-colors ${
          focusMode ? "bg-blue-500 border-blue-500 text-white" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
        }`}
        title="フォーカスモード"
      >
        <Focus className="size-5" />
      </button>

      <ReactFlow
        nodes={nodesWithCallbacks}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeMouseEnter={(_, node) => handleNodeHover(node.id)}
        onNodeMouseLeave={() => handleNodeHover(null)}
        onNodeDragStart={(_, node) => bringToFront(node.id)}
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
            bringToFront(nodeId);
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
