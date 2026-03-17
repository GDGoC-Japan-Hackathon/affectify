"use client";

import { useCallback, useState, useMemo, useRef, useEffect, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import { ReactFlow, Background, Controls, MiniMap, SelectionMode, useNodesState, useEdgesState, useReactFlow, ReactFlowProvider, type Node, type Edge, type NodeTypes, type EdgeTypes, type NodeChange, MarkerType } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { BoardNode, BoardEdge } from "@/types/type";
import { CodeCard } from "./CodeCard";
import { AnimatedEdge } from "./AnimatedEdge";
import { FileTreePanel } from "./FileTreePanel";
import { CodeViewerWindow } from "./CodeViewerWindow";
import { FolderTree, Focus, FoldVertical, LayoutDashboard, MousePointer2, RotateCcw, RotateCw } from "lucide-react";
import { computeLayout, computeSCCs } from "@/utils/graphLayout";

interface WhiteboardProps {
  boardNodes: BoardNode[];
  boardEdges: BoardEdge[];
}

interface ViewerWindow {
  id: number;
  tabs: string[];
  activeTab: string;
}

interface NamedCheckpoint {
  id: string;
  name: string;
  nodes: Node[];
}

interface HistorySnapshot {
  nodes: Node[];
  checkpoints: NamedCheckpoint[];
  selectedCheckpointId: string;
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

function toFlowEdges(boardEdges: BoardEdge[], sccEdgeIds?: Set<string>): Edge[] {
  return boardEdges.map((e) => {
    const hasArrow = e.kind === "call" || e.kind === "import";
    const isScc = sccEdgeIds?.has(e.id) ?? false;
    const edgeColor = isScc ? "#ef4444" : "#94a3b8";

    return {
      id: e.id,
      source: e.from_node_id,
      target: e.to_node_id,
      type: "animated",
      style: {
        strokeDasharray: e.kind === "import" ? "6 3" : e.kind === "implement" ? "2 2" : undefined,
        stroke: edgeColor,
        strokeWidth: isScc ? 2.5 : 2,
      },
      markerEnd: hasArrow ? { type: MarkerType.ArrowClosed, color: edgeColor } : undefined,
    };
  });
}

function isPointInPolygon(point: { x: number; y: number }, polygon: Array<{ x: number; y: number }>): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersects = yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / ((yj - yi) || 1e-9) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function getPolygonBounds(points: Array<{ x: number; y: number }>) {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

function WhiteboardInner({ boardNodes, boardEdges }: WhiteboardProps) {
  const initialNodes = useMemo(() => toFlowNodes(boardNodes), [boardNodes]);

  const sccEdgeIds = useMemo(() => {
    const sccs = computeSCCs(
      boardNodes.map((n) => n.id),
      boardEdges,
    );
    const nodeToScc = new Map<string, number>();
    sccs.forEach((scc, i) => {
      if (scc.length > 1) scc.forEach((id) => nodeToScc.set(id, i));
    });
    const ids = new Set<string>();
    for (const e of boardEdges) {
      const si = nodeToScc.get(e.from_node_id);
      const ti = nodeToScc.get(e.to_node_id);
      if (si !== undefined && ti !== undefined && si === ti) ids.add(e.id);
    }
    return ids;
  }, [boardNodes, boardEdges]);

  const initialEdges = useMemo(() => toFlowEdges(boardEdges, sccEdgeIds), [boardEdges, sccEdgeIds]);

  const [nodes, setNodes, onNodesChangeBase] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const reactFlow = useReactFlow();
  const { fitView } = reactFlow;

  const [focusMode, setFocusMode] = useState(false);
  const [closeAllCounter, setCloseAllCounter] = useState(0);
  const [layoutXGap, setLayoutXGap] = useState(200);
  const [layoutYGap, setLayoutYGap] = useState(200);
  const [isLayoutPanelOpen, setIsLayoutPanelOpen] = useState(false);
  const [isSaveMenuOpen, setIsSaveMenuOpen] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isLassoDrawing, setIsLassoDrawing] = useState(false);
  const [lassoScreenPoints, setLassoScreenPoints] = useState<Array<{ x: number; y: number }>>([]);
  const lassoFlowPointsRef = useRef<Array<{ x: number; y: number }>>([]);
  const lassoScreenPointsRef = useRef<Array<{ x: number; y: number }>>([]);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const layoutClickTimeoutRef = useRef<number | null>(null);
  const layoutButtonRef = useRef<HTMLButtonElement | null>(null);
  const layoutPanelRef = useRef<HTMLDivElement | null>(null);
  const saveMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const saveMenuPanelRef = useRef<HTMLDivElement | null>(null);
  const zMax = useRef(100);
  const hoverNodeId = useRef<string | null>(null);
  const hoverSavedZ = useRef<number>(0);
  const historyPastRef = useRef<HistorySnapshot[]>([]);
  const historyFutureRef = useRef<HistorySnapshot[]>([]);
  const [, setHistoryTick] = useState(0);
  const [checkpoints, setCheckpoints] = useState<NamedCheckpoint[]>([]);
  const [selectedCheckpointId, setSelectedCheckpointId] = useState("");
  const suppressHistoryRef = useRef(false);
  const isLayoutAdjustingRef = useRef(false);
  const isCodeEditSessionRef = useRef(false);
  const codeEditSessionTimerRef = useRef<number | null>(null);
  const suppressSelectChangeRef = useRef(false);
  const lassoDragRef = useRef(false);
  const lassoMouseDownRef = useRef(false);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      if (!suppressSelectChangeRef.current) {
        if (isSelectionMode) {
          onNodesChangeBase(changes.filter((change) => !(change.type === "select" && change.selected === false)));
          return;
        }
        onNodesChangeBase(changes);
        return;
      }
      onNodesChangeBase(changes.filter((change) => change.type !== "select"));
    },
    [onNodesChangeBase, isSelectionMode],
  );

  const cloneNodesSnapshot = useCallback((list: Node[]): Node[] => {
    return list.map((n) => ({
      ...n,
      position: { ...n.position },
      data: { ...(n.data as Record<string, unknown>) },
      style: n.style ? { ...n.style } : undefined,
    }));
  }, []);

  const cloneCheckpointsSnapshot = useCallback(
    (list: NamedCheckpoint[]): NamedCheckpoint[] => {
      return list.map((cp) => ({
        ...cp,
        nodes: cloneNodesSnapshot(cp.nodes),
      }));
    },
    [cloneNodesSnapshot],
  );

  const makeHistorySnapshot = useCallback(
    (sourceNodes: Node[] = nodes, sourceCheckpoints: NamedCheckpoint[] = checkpoints, sourceSelectedCheckpointId: string = selectedCheckpointId): HistorySnapshot => ({
      nodes: cloneNodesSnapshot(sourceNodes),
      checkpoints: cloneCheckpointsSnapshot(sourceCheckpoints),
      selectedCheckpointId: sourceSelectedCheckpointId,
    }),
    [nodes, checkpoints, selectedCheckpointId, cloneNodesSnapshot, cloneCheckpointsSnapshot],
  );

  const pushHistorySnapshot = useCallback(
    (snapshot?: HistorySnapshot) => {
      if (suppressHistoryRef.current) return;
      historyPastRef.current.push(snapshot ?? makeHistorySnapshot());
      if (historyPastRef.current.length > 100) historyPastRef.current.shift();
      historyFutureRef.current = [];
      setHistoryTick((v) => v + 1);
    },
    [makeHistorySnapshot],
  );

  const undo = useCallback(() => {
    if (historyPastRef.current.length === 0) return;
    const prev = historyPastRef.current.pop();
    if (!prev) return;

    historyFutureRef.current.push(makeHistorySnapshot());
    suppressHistoryRef.current = true;
    setNodes(cloneNodesSnapshot(prev.nodes));
    setCheckpoints(cloneCheckpointsSnapshot(prev.checkpoints));
    setSelectedCheckpointId(prev.selectedCheckpointId);
    queueMicrotask(() => {
      suppressHistoryRef.current = false;
    });
    setHistoryTick((v) => v + 1);
  }, [setNodes, cloneNodesSnapshot, makeHistorySnapshot, cloneCheckpointsSnapshot]);

  const redo = useCallback(() => {
    if (historyFutureRef.current.length === 0) return;
    const next = historyFutureRef.current.pop();
    if (!next) return;

    historyPastRef.current.push(makeHistorySnapshot());
    suppressHistoryRef.current = true;
    setNodes(cloneNodesSnapshot(next.nodes));
    setCheckpoints(cloneCheckpointsSnapshot(next.checkpoints));
    setSelectedCheckpointId(next.selectedCheckpointId);
    queueMicrotask(() => {
      suppressHistoryRef.current = false;
    });
    setHistoryTick((v) => v + 1);
  }, [setNodes, cloneNodesSnapshot, makeHistorySnapshot, cloneCheckpointsSnapshot]);

  const saveCheckpoint = useCallback(() => {
    const now = new Date();
    const pad2 = (n: number) => String(n).padStart(2, "0");
    const suggested = `${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}${pad2(now.getHours())}${pad2(now.getMinutes())}${pad2(now.getSeconds())}`;
    const input = window.prompt("スナップショット名を入力", suggested);
    if (input === null) return;
    const name = input.trim() || suggested;
    const id = `cp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const snapshot = cloneNodesSnapshot(nodes);

    pushHistorySnapshot();
    setCheckpoints((prev) => [{ id, name, nodes: snapshot }, ...prev]);
    setSelectedCheckpointId(id);
  }, [nodes, cloneNodesSnapshot, pushHistorySnapshot]);

  const restoreCheckpoint = useCallback(() => {
    const target = checkpoints.find((cp) => cp.id === selectedCheckpointId);
    if (!target) return;

    // 復元操作自体をUndo可能にするため、復元前状態を履歴に積む
    pushHistorySnapshot();
    setNodes(cloneNodesSnapshot(target.nodes));
  }, [checkpoints, selectedCheckpointId, nodes, setNodes, cloneNodesSnapshot, pushHistorySnapshot]);

  const deleteCheckpoint = useCallback(
    (checkpointId?: string) => {
      const targetId = checkpointId ?? selectedCheckpointId;
      if (!targetId) return;
      pushHistorySnapshot();
      setCheckpoints((prev) => prev.filter((cp) => cp.id !== targetId));
      setSelectedCheckpointId((prev) => (prev === targetId ? "" : prev));
    },
    [selectedCheckpointId, pushHistorySnapshot],
  );

  // zMaxを+1してノードを最前面にする（展開・クリック・ドラッグ用）
  const bringToFront = useCallback(
    (nodeId: string) => {
      zMax.current += 1;
      const z = zMax.current;
      // ホバー中のノードなら保存値も更新（ホバー解除で戻されるのを防ぐ）
      if (hoverNodeId.current === nodeId) {
        hoverSavedZ.current = z;
      }
      setNodes((nds) => nds.map((n) => (n.id === nodeId ? { ...n, zIndex: z } : n)));
    },
    [setNodes],
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
              opacity: nodeId ? (e.source === nodeId || e.target === nodeId ? 1 : 0.1) : 1,
            },
          })),
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
    [setNodes, setEdges, edges, focusMode],
  );

  const [fileTreeOpen, setFileTreeOpen] = useState(false);
  const windowZMax = useRef(9999);
  const [windowZIndexes, setWindowZIndexes] = useState<Record<number, number>>({});
  const layoutAnimFrameRef = useRef<number | null>(null);
  const layoutViewFrameRef = useRef<number | null>(null);
  const isLayoutAnimatingRef = useRef(false);
  const hasAutoLayoutedRef = useRef(false);

  const applyLayoutInstant = useCallback(
    (xGap: number, yGap: number) => {
      if (!isLayoutAdjustingRef.current) {
        pushHistorySnapshot();
        isLayoutAdjustingRef.current = true;
      }
      const currentBoardEdges = edges.map((e) => ({
        id: e.id,
        from_node_id: e.source,
        to_node_id: e.target,
        kind: "call" as const,
        style: "solid" as const,
      }));
      setNodes((nds) => {
        const currentBoardNodes = nds.map((n) => n.data as unknown as BoardNode);
        const targetPositions = computeLayout(currentBoardNodes, currentBoardEdges, { xGap, yGap });

        return nds.map((n) => {
          const to = targetPositions.get(n.id);
          if (!to) return n;
          return { ...n, position: { x: to.x, y: to.y } };
        });
      });
    },
    [edges, setNodes, pushHistorySnapshot],
  );

  // 自動レイアウト
  const handleAutoLayout = useCallback(
    (xGap = layoutXGap, yGap = layoutYGap) => {
      if (isLayoutAnimatingRef.current) return;

      pushHistorySnapshot();

      const boardNodes = nodes.map((n) => n.data as unknown as BoardNode);
      const boardEdges = edges.map((e) => ({
        id: e.id,
        from_node_id: e.source,
        to_node_id: e.target,
        kind: "call" as const,
        style: "solid" as const,
      }));
      const targetPositions = computeLayout(boardNodes, boardEdges, {
        xGap,
        yGap,
      });
      const startPositions = new Map(nodes.map((n) => [n.id, { x: n.position.x, y: n.position.y }]));

      const durationMs = 700;
      const startAt = performance.now();
      isLayoutAnimatingRef.current = true;

      // 開始時に少し引いて全体が動く余地を作る
      fitView({ padding: 0.35, duration: 220 });

      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

      const tick = (now: number) => {
        const t = Math.min(1, (now - startAt) / durationMs);
        const p = easeOutCubic(t);

        setNodes((nds) =>
          nds.map((n) => {
            const from = startPositions.get(n.id);
            const to = targetPositions.get(n.id);
            if (!from || !to) return n;
            return {
              ...n,
              position: {
                x: from.x + (to.x - from.x) * p,
                y: from.y + (to.y - from.y) * p,
              },
            };
          }),
        );

        if (t < 1) {
          layoutAnimFrameRef.current = requestAnimationFrame(tick);
          return;
        }

        isLayoutAnimatingRef.current = false;
        layoutAnimFrameRef.current = null;
        fitView({ padding: 0.2, duration: 420 });
      };

      if (layoutAnimFrameRef.current !== null) {
        cancelAnimationFrame(layoutAnimFrameRef.current);
      }
      layoutAnimFrameRef.current = requestAnimationFrame(tick);

      // TODO: APIが追加されたら以下でDBのx,yを保存する
      // targetPositions.forEach((pos, nodeId) => updateNodePosition(nodeId, pos.x, pos.y));
    },
    [nodes, edges, setNodes, fitView, layoutXGap, layoutYGap, pushHistorySnapshot],
  );

  useEffect(() => {
    if (!isLayoutPanelOpen || isLayoutAnimatingRef.current) return;
    applyLayoutInstant(layoutXGap, layoutYGap);

    if (layoutViewFrameRef.current !== null) {
      cancelAnimationFrame(layoutViewFrameRef.current);
    }
    layoutViewFrameRef.current = requestAnimationFrame(() => {
      fitView({ padding: 0.2, duration: 180 });
      layoutViewFrameRef.current = null;
    });
  }, [isLayoutPanelOpen, layoutXGap, layoutYGap, applyLayoutInstant]);

  useEffect(() => {
    if (!isLayoutPanelOpen) {
      isLayoutAdjustingRef.current = false;
    }
  }, [isLayoutPanelOpen]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }

      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;

      if (e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if ((e.key.toLowerCase() === "z" && e.shiftKey) || e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [undo, redo]);

  useEffect(() => {
    return () => {
      if (layoutClickTimeoutRef.current !== null) {
        window.clearTimeout(layoutClickTimeoutRef.current);
      }
      if (codeEditSessionTimerRef.current !== null) {
        window.clearTimeout(codeEditSessionTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isLayoutPanelOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof globalThis.Element)) return;
      if (layoutButtonRef.current?.contains(target)) return;
      if (layoutPanelRef.current?.contains(target)) return;
      setIsLayoutPanelOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [isLayoutPanelOpen]);

  useEffect(() => {
    if (!isSaveMenuOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof globalThis.Element)) return;
      if (saveMenuButtonRef.current?.contains(target)) return;
      if (saveMenuPanelRef.current?.contains(target)) return;
      setIsSaveMenuOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [isSaveMenuOpen]);

  const windowIdCounter = useRef(0);
  const [viewerWindows, setViewerWindows] = useState<ViewerWindow[]>([]);

  // 新規ノード追加
  const newNodeCounter = useRef(0);
  const handleAddNode = useCallback(
    (afterNodeId: string | null, filePath: string, name: string) => {
      pushHistorySnapshot();
      newNodeCounter.current += 1;
      const newId = `new-node-${Date.now()}-${newNodeCounter.current}`;
      const funcName = name || "newFunction";
      const refNode = afterNodeId ? nodes.find((n) => n.id === afterNodeId) : nodes.find((n) => (n.data as unknown as BoardNode).file_path === filePath);
      const x = refNode?.position.x ?? 100;
      const y = refNode ? (afterNodeId ? refNode.position.y + 250 : refNode.position.y - 250) : 100;
      const newBoardNode: BoardNode = {
        id: newId,
        title: funcName,
        kind: "function",
        code_text: `func ${funcName}() {\n\t\n}`,
        file_path: filePath,
        signature: "",
        receiver: "",
        x,
        y,
      };
      setNodes((nds) => {
        const newNode = { id: newId, type: "codeCard" as const, position: { x, y }, data: { ...newBoardNode }, zIndex: 0 };
        if (!afterNodeId) {
          const firstInFileIdx = nds.findIndex((n) => (n.data as unknown as BoardNode).file_path === filePath);
          if (firstInFileIdx === -1) return [...nds, newNode];
          return [...nds.slice(0, firstInFileIdx), newNode, ...nds.slice(firstInFileIdx)];
        }
        const afterIdx = nds.findIndex((n) => n.id === afterNodeId);
        if (afterIdx === -1) return [...nds, newNode];
        return [...nds.slice(0, afterIdx + 1), newNode, ...nds.slice(afterIdx + 1)];
      });
    },
    [nodes, setNodes, pushHistorySnapshot],
  );

  // コード編集時にノードデータを更新
  const handleCodeChange = useCallback(
    (nodeId: string, code: string) => {
      if (!isCodeEditSessionRef.current) {
        pushHistorySnapshot();
        isCodeEditSessionRef.current = true;
      }
      if (codeEditSessionTimerRef.current !== null) {
        window.clearTimeout(codeEditSessionTimerRef.current);
      }
      codeEditSessionTimerRef.current = window.setTimeout(() => {
        isCodeEditSessionRef.current = false;
        codeEditSessionTimerRef.current = null;
      }, 700);

      setNodes((nds) => nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, code_text: code } } : n)));
    },
    [setNodes, pushHistorySnapshot],
  );

  // ノード展開時にzIndexを上げる + フィットして全体表示
  const handleExpand = useCallback(
    (nodeId: string, isExpanded: boolean) => {
      if (isExpanded) {
        bringToFront(nodeId);
      } else {
        setNodes((nds) => nds.map((n) => (n.id === nodeId ? { ...n, zIndex: 0 } : n)));
      }
    },
    [setNodes, fitView, bringToFront],
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
        style: {
          ...n.style,
          // Make selected elements visually obvious with a soft glow.
          boxShadow: n.selected ? "0 0 0 2px rgba(59,130,246,0.9), 0 0 20px rgba(59,130,246,0.45)" : n.style?.boxShadow,
          transition: "box-shadow 120ms ease-out",
        },
        data: { ...n.data, onCodeChange: handleCodeChange, onExpand: handleExpand, edgeCount: edgeCounts[n.id] ?? 0, closeAllCounter },
      })),
    [nodes, handleCodeChange, handleExpand, edgeCounts, closeAllCounter],
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
          return prev.map((w) => (w.id === existing.id ? { ...w, activeTab: filePath } : w));
        }
        // 最初のウィンドウにタブ追加
        return prev.map((w, i) => (i === 0 ? { ...w, tabs: [...w.tabs, filePath], activeTab: filePath } : w));
      });
      const ids = nodes.filter((n) => (n.data as unknown as BoardNode).file_path === filePath).map((n) => n.id);
      if (ids.length > 0) {
        fitView({ nodes: ids.map((id) => ({ id })), padding: 0.3, duration: 500 });
      }
    },
    [nodes, fitView],
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

  const finalizeLassoSelection = useCallback(() => {
    const polygon = lassoFlowPointsRef.current;
    if (polygon.length < 3) {
      setIsLassoDrawing(false);
      setLassoScreenPoints([]);
      lassoFlowPointsRef.current = [];
      lassoScreenPointsRef.current = [];
      lassoDragRef.current = false;
      return;
    }

    const bounds = getPolygonBounds(polygon);

    suppressSelectChangeRef.current = true;
    setNodes((nds) =>
      nds.map((n) => {
        const width = n.width ?? 220;
        const height = n.height ?? 120;
        const pos = n.position;
        const center = {
          x: pos.x + width / 2,
          y: pos.y + height / 2,
        };
        const corners = [
          { x: pos.x, y: pos.y },
          { x: pos.x + width, y: pos.y },
          { x: pos.x + width, y: pos.y + height },
          { x: pos.x, y: pos.y + height },
        ];
        const intersectsBounds = !(pos.x + width < bounds.minX || pos.x > bounds.maxX || pos.y + height < bounds.minY || pos.y > bounds.maxY);
        const selectedByPolygon = isPointInPolygon(center, polygon) || corners.some((pt) => isPointInPolygon(pt, polygon));
        return {
          ...n,
          selected: selectedByPolygon || intersectsBounds,
        };
      }),
    );
    window.setTimeout(() => {
      suppressSelectChangeRef.current = false;
    }, 0);

    setIsLassoDrawing(false);
    setLassoScreenPoints([]);
    lassoFlowPointsRef.current = [];
    lassoScreenPointsRef.current = [];
    lassoDragRef.current = false;
  }, [setNodes]);

  const appendLassoPointFromMouse = useCallback(
    (event: Pick<ReactMouseEvent<HTMLDivElement>, "clientX" | "clientY">) => {
      const paneElement = boardRef.current;
      if (!paneElement) return;

      const rect = paneElement.getBoundingClientRect();
      const screenPoint = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
      const lastScreen = lassoScreenPointsRef.current[lassoScreenPointsRef.current.length - 1];
      if (lastScreen) {
        const dx = screenPoint.x - lastScreen.x;
        const dy = screenPoint.y - lastScreen.y;
        if (dx * dx + dy * dy < 9) return;
      }

      const flowPoint = reactFlow.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const nextScreen = [...lassoScreenPointsRef.current, screenPoint];
      const nextFlow = [...lassoFlowPointsRef.current, flowPoint];
      lassoScreenPointsRef.current = nextScreen;
      lassoFlowPointsRef.current = nextFlow;
      setLassoScreenPoints(nextScreen);
    },
    [reactFlow],
  );

  const handleLassoOverlayMouseDown = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (!isSelectionMode) return;
      if (event.button === 2) return;

      lassoMouseDownRef.current = true;

      const paneElement = boardRef.current;
      if (!paneElement) return;

      const rect = paneElement.getBoundingClientRect();
      const firstScreenPoint = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
      const firstFlowPoint = reactFlow.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      lassoScreenPointsRef.current = [firstScreenPoint];
      lassoFlowPointsRef.current = [firstFlowPoint];
      setLassoScreenPoints([firstScreenPoint]);
      setIsLassoDrawing(true);
      lassoDragRef.current = false;
      event.preventDefault();
    },
    [isSelectionMode, reactFlow],
  );

  const handleLassoOverlayMouseMove = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (!isSelectionMode || !isLassoDrawing) return;
      if ((event.buttons & 1) !== 1) return;
      lassoDragRef.current = true;
      appendLassoPointFromMouse(event);
    },
    [isSelectionMode, isLassoDrawing, appendLassoPointFromMouse],
  );

  const handleLassoOverlayMouseUp = useCallback(() => {
    lassoMouseDownRef.current = false;
    if (!isSelectionMode || !isLassoDrawing) return;

    finalizeLassoSelection();
  }, [isSelectionMode, isLassoDrawing, finalizeLassoSelection]);

  const handleLassoOverlayPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      handleLassoOverlayMouseDown(event as unknown as ReactMouseEvent<HTMLDivElement>);
    },
    [handleLassoOverlayMouseDown],
  );

  const handleLassoOverlayPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      handleLassoOverlayMouseMove(event as unknown as ReactMouseEvent<HTMLDivElement>);
    },
    [handleLassoOverlayMouseMove],
  );

  const handleLassoOverlayPointerUp = useCallback(() => {
    handleLassoOverlayMouseUp();
  }, [handleLassoOverlayMouseUp]);

  useEffect(() => {
    if (!isLassoDrawing) return;

    const onWindowMouseMove = (event: MouseEvent) => {
      if (!isSelectionMode) return;
      if ((event.buttons & 1) !== 1) return;
      lassoDragRef.current = true;
      appendLassoPointFromMouse(event);
    };

    const onWindowMouseUp = () => {
      lassoMouseDownRef.current = false;
      if (lassoDragRef.current) {
        finalizeLassoSelection();
      }
    };

    const onWindowPointerMove = (event: PointerEvent) => {
      if (!isSelectionMode) return;
      if ((event.buttons & 1) !== 1) return;
      lassoDragRef.current = true;
      appendLassoPointFromMouse(event);
    };

    const onWindowPointerUp = () => {
      lassoMouseDownRef.current = false;
      if (lassoDragRef.current) {
        finalizeLassoSelection();
      }
    };

    window.addEventListener("mousemove", onWindowMouseMove);
    window.addEventListener("mouseup", onWindowMouseUp);
    window.addEventListener("pointermove", onWindowPointerMove);
    window.addEventListener("pointerup", onWindowPointerUp);
    return () => {
      window.removeEventListener("mousemove", onWindowMouseMove);
      window.removeEventListener("mouseup", onWindowMouseUp);
      window.removeEventListener("pointermove", onWindowPointerMove);
      window.removeEventListener("pointerup", onWindowPointerUp);
    };
  }, [isLassoDrawing, finalizeLassoSelection, appendLassoPointFromMouse, isSelectionMode]);

  const lassoPathD = useMemo(() => {
    if (lassoScreenPoints.length === 0) return "";
    const [first, ...rest] = lassoScreenPoints;
    const path = [`M ${first.x} ${first.y}`, ...rest.map((p) => `L ${p.x} ${p.y}`)];
    if (lassoScreenPoints.length > 2) {
      path.push("Z");
    }
    return path.join(" ");
  }, [lassoScreenPoints]);

  return (
    <div ref={boardRef} className={`w-full h-full relative ${isSelectionMode ? "select-none" : ""}`}>
      {/* 右上コントロール */}
      <div data-lasso-ignore="true" className="absolute top-4 right-4 z-40 flex flex-col items-end gap-2">
        <div className="flex items-center gap-2">
          <button onClick={undo} disabled={historyPastRef.current.length === 0} className="bg-white border border-gray-200 rounded-lg p-2 shadow-md hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed" title="Undo (Ctrl/Cmd+Z)">
            <RotateCcw className="size-5 text-gray-700" />
          </button>

          <button onClick={redo} disabled={historyFutureRef.current.length === 0} className="bg-white border border-gray-200 rounded-lg p-2 shadow-md hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed" title="Redo (Ctrl/Cmd+Shift+Z / Ctrl/Cmd+Y)">
            <RotateCw className="size-5 text-gray-700" />
          </button>

          <div className="relative">
            <button ref={saveMenuButtonRef} onClick={() => setIsSaveMenuOpen((prev) => !prev)} className="bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-medium text-gray-700 shadow-md hover:bg-gray-50 transition-colors" title="セーブメニュー">
              セーブ
            </button>

            {isSaveMenuOpen && (
              <div ref={saveMenuPanelRef} className="absolute right-0 mt-2 w-64 rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
                <button onClick={saveCheckpoint} className="mb-2 w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50" title="名前付きで現在地点を保存">
                  名前付きで保存
                </button>

                <div className="mb-2 max-h-40 overflow-y-auto rounded-md border border-gray-200">
                  {checkpoints.length === 0 ? (
                    <div className="px-2 py-2 text-xs text-gray-500">セーブ地点はまだありません</div>
                  ) : (
                    checkpoints.map((cp) => {
                      const selected = cp.id === selectedCheckpointId;
                      return (
                        <div key={cp.id} className={`flex items-center justify-between gap-2 border-b border-gray-100 px-2 py-1.5 last:border-b-0 ${selected ? "bg-blue-50" : ""}`}>
                          <button onClick={() => setSelectedCheckpointId(cp.id)} className="min-w-0 flex-1 truncate text-left text-xs text-gray-700" title={cp.name}>
                            {cp.name}
                          </button>
                          <button onClick={() => deleteCheckpoint(cp.id)} className="h-5 w-5 rounded text-xs leading-5 text-gray-500 hover:bg-gray-100 hover:text-gray-700" title="このセーブ地点を削除（Undo可能）">
                            ×
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="flex">
                  <button onClick={restoreCheckpoint} disabled={!selectedCheckpointId} className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed" title="選択中のスナップショットを復元（Undo可能）">
                    このスナップショットを復元
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            ref={layoutButtonRef}
            onClick={() => {
              if (layoutClickTimeoutRef.current !== null) {
                window.clearTimeout(layoutClickTimeoutRef.current);
              }

              if (isLayoutPanelOpen) {
                setIsLayoutPanelOpen(false);
                return;
              }

              layoutClickTimeoutRef.current = window.setTimeout(() => {
                setIsLayoutPanelOpen(false);
                handleAutoLayout(layoutXGap, layoutYGap);
                layoutClickTimeoutRef.current = null;
              }, 220);
            }}
            onDoubleClick={() => {
              if (layoutClickTimeoutRef.current !== null) {
                window.clearTimeout(layoutClickTimeoutRef.current);
                layoutClickTimeoutRef.current = null;
              }
              const opening = !isLayoutPanelOpen;
              setIsLayoutPanelOpen(opening);
              if (opening) {
                applyLayoutInstant(layoutXGap, layoutYGap);
                fitView({ padding: 0.2, duration: 220 });
              }
            }}
            className="bg-white border border-gray-200 rounded-lg p-2 shadow-md hover:bg-gray-50 transition-colors"
            title="自動レイアウト"
          >
            <LayoutDashboard className="size-5 text-gray-700" />
          </button>

          <button onClick={() => setCloseAllCounter((c) => c + 1)} className="bg-white border border-gray-200 rounded-lg p-2 shadow-md hover:bg-gray-50 transition-colors" title="すべてのノードを閉じる">
            <FoldVertical className="size-5 text-gray-700" />
          </button>

          <button onClick={() => setFocusMode((prev) => !prev)} className={`border rounded-lg p-2 shadow-md transition-colors ${focusMode ? "bg-blue-500 border-blue-500 text-white" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"}`} title="フォーカスモード">
            <Focus className="size-5" />
          </button>

          <button onClick={() => setIsSelectionMode((prev) => !prev)} className={`border rounded-lg p-2 shadow-md transition-colors ${isSelectionMode ? "bg-blue-500 border-blue-500 text-white" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"}`} title={isSelectionMode ? "範囲選択モード ON" : "範囲選択モード OFF"}>
            <MousePointer2 className="size-5" />
          </button>

          <button onClick={() => setFileTreeOpen((prev) => !prev)} className="bg-white border border-gray-200 rounded-lg p-2 shadow-md hover:bg-gray-50 transition-colors" title="ファイルツリー">
            <FolderTree className="size-5 text-gray-700" />
          </button>
        </div>

        <div ref={layoutPanelRef} className={`w-72 origin-top overflow-hidden rounded-lg border bg-white/95 shadow-md backdrop-blur-sm transition-all duration-250 ease-out ${isLayoutPanelOpen ? "max-h-48 translate-y-0 scale-100 border-gray-200 p-3 opacity-100" : "max-h-0 -translate-y-1 scale-95 border-transparent p-0 opacity-0 pointer-events-none"}`}>
          <div className="mb-2 text-xs font-semibold text-gray-700">レイアウト間隔</div>

          <label className="mb-1 block text-xs text-gray-600">X間隔: {layoutXGap}px</label>
          <input
            type="range"
            min={0}
            max={420}
            step={10}
            value={layoutXGap}
            onChange={(e) => {
              const next = Number(e.target.value);
              if (Number.isFinite(next)) setLayoutXGap(next);
            }}
            className="mb-3 w-full"
          />

          <label className="mb-1 block text-xs text-gray-600">Y間隔: {layoutYGap}px</label>
          <input
            type="range"
            min={0}
            max={420}
            step={10}
            value={layoutYGap}
            onChange={(e) => {
              const next = Number(e.target.value);
              if (Number.isFinite(next)) setLayoutYGap(next);
            }}
            className="w-full"
          />
        </div>
      </div>

      <ReactFlow
        nodes={nodesWithCallbacks}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeMouseEnter={(_, node) => handleNodeHover(node.id)}
        onNodeMouseLeave={() => handleNodeHover(null)}
        onNodeDragStart={(_, node) => {
          pushHistorySnapshot();
          bringToFront(node.id);
        }}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        selectionOnDrag={false}
        panOnDrag={!isSelectionMode}
        selectionMode={SelectionMode.Partial}
        multiSelectionKeyCode={["Shift", "Meta", "Control"]}
        proOptions={{ hideAttribution: true }}
        onInit={() => {
          if (hasAutoLayoutedRef.current) return;
          const allAtOrigin = nodes.every((n) => n.position.x === 0 && n.position.y === 0);
          if (allAtOrigin && nodes.length > 1) {
            hasAutoLayoutedRef.current = true;
            setTimeout(() => handleAutoLayout(), 150);
          }
        }}
      >
        <Background gap={20} size={1} />
        <Controls />
        <MiniMap nodeColor={miniMapNodeColor} maskColor="rgba(0,0,0,0.08)" pannable zoomable />
      </ReactFlow>

      {isSelectionMode && (
        <div
          className="absolute inset-0 z-30 touch-none cursor-crosshair"
          onMouseDown={handleLassoOverlayMouseDown}
          onMouseMove={handleLassoOverlayMouseMove}
          onMouseUp={handleLassoOverlayMouseUp}
          onPointerDown={handleLassoOverlayPointerDown}
          onPointerMove={handleLassoOverlayPointerMove}
          onPointerUp={handleLassoOverlayPointerUp}
        />
      )}

      {isSelectionMode && lassoScreenPoints.length > 0 && (
        <svg className="pointer-events-none absolute inset-0 z-50 h-full w-full" style={{ zIndex: 10000 }}>
          <path
            d={lassoPathD}
            fill="rgba(59, 130, 246, 0.12)"
            stroke="rgba(59, 130, 246, 0.9)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <circle cx={lassoScreenPoints[0].x} cy={lassoScreenPoints[0].y} r={3} fill="rgba(59, 130, 246, 0.95)" />
        </svg>
      )}

      {/* ファイルツリーパネル */}
      <FileTreePanel nodes={boardNodes} isOpen={fileTreeOpen} onClose={() => setFileTreeOpen(false)} onFileSelect={handleFileSelect} />

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
            nodes: nodes.map((n) => n.data as unknown as BoardNode).filter((n) => n.file_path === fp),
          }))}
          activeTab={win.activeTab}
          initialPosition={{
            x: typeof window !== "undefined" ? Math.max(100, window.innerWidth - 600 - idx * 40) : 100,
            y: 80 + idx * 40,
          }}
          onTabChange={(fp) => {
            setViewerWindows((prev) => prev.map((w) => (w.id === win.id ? { ...w, activeTab: fp } : w)));
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
            fitView({ nodes: [{ id: nodeId }], padding: 2.5, duration: 500, maxZoom: 0.8 });
          }}
          onCodeSync={handleCodeChange}
          onAddNode={handleAddNode}
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
