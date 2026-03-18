"use client";

import { memo, useState, useRef, useCallback, useEffect } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { Pencil, Eraser, Trash2 } from "lucide-react";
import type { BoardNode } from "@/types/type";

interface DrawPath {
  points: Array<{ x: number; y: number }>;
  color: string;
  width: number;
}

type DrawingCardNode = Node<BoardNode & Record<string, unknown>, "drawingCard">;

const CANVAS_W = 360;
const CANVAS_H = 280;

function pathToD(points: Array<{ x: number; y: number }>): string {
  if (points.length < 2) return "";
  const [first, ...rest] = points;
  return [`M ${first.x} ${first.y}`, ...rest.map((p) => `L ${p.x} ${p.y}`)].join(" ");
}

function parsePaths(raw: string): DrawPath[] {
  try {
    return JSON.parse(raw || "[]");
  } catch {
    return [];
  }
}

function DrawingCardInner({ data }: NodeProps<DrawingCardNode>) {
  const onCodeChange = (data as Record<string, unknown>).onCodeChange as ((nodeId: string, code: string) => void) | undefined;
  const highlighted = (data as Record<string, unknown>).highlighted as boolean | undefined;

  const [completedPaths, setCompletedPaths] = useState<DrawPath[]>(() => parsePaths(data.code_text));
  const [livePath, setLivePath] = useState<DrawPath | null>(null);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [penColor, setPenColor] = useState("#1e293b");

  const isDrawingActiveRef = useRef(false);
  const svgRef = useRef<SVGSVGElement>(null);

  // Sync from external changes (undo/redo) only when not actively drawing
  useEffect(() => {
    if (isDrawingActiveRef.current) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCompletedPaths(parsePaths(data.code_text));
  }, [data.code_text]);

  const savePaths = useCallback(
    (paths: DrawPath[]) => {
      onCodeChange?.(data.id, JSON.stringify(paths));
    },
    [data.id, onCodeChange],
  );

  const getPos = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: Math.round(((e.clientX - rect.left) / rect.width) * CANVAS_W),
      y: Math.round(((e.clientY - rect.top) / rect.height) * CANVAS_H),
    };
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      const pos = getPos(e);

      if (tool === "eraser") {
        const next = completedPaths.filter((p) => !p.points.some((pt) => Math.hypot(pt.x - pos.x, pt.y - pos.y) < 18));
        setCompletedPaths(next);
        savePaths(next);
        return;
      }

      isDrawingActiveRef.current = true;
      setLivePath({ points: [pos], color: penColor, width: 2.5 });
    },
    [tool, completedPaths, getPos, penColor, savePaths],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      e.stopPropagation();
      if (!isDrawingActiveRef.current || tool !== "pen") return;
      const pos = getPos(e);
      setLivePath((prev) => (prev ? { ...prev, points: [...prev.points, pos] } : null));
    },
    [tool, getPos],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      e.stopPropagation();
      if (!isDrawingActiveRef.current || !livePath) return;
      isDrawingActiveRef.current = false;
      const next = [...completedPaths, livePath];
      setCompletedPaths(next);
      setLivePath(null);
      savePaths(next);
    },
    [livePath, completedPaths, savePaths],
  );

  const handleClear = useCallback(() => {
    setCompletedPaths([]);
    setLivePath(null);
    savePaths([]);
  }, [savePaths]);

  const allPaths = livePath ? [...completedPaths, livePath] : completedPaths;

  return (
    <div
      className={`rounded-lg border-2 shadow-lg overflow-hidden bg-white ${highlighted ? "ring-4 ring-yellow-400" : ""}`}
      style={{ width: CANVAS_W, borderColor: highlighted ? "#facc15" : "#c4b5fd" }}
    >
      <Handle type="target" position={Position.Left} className="!bg-gray-400 !w-3 !h-3" />

      {/* ツールバー */}
      <div className="flex items-center gap-1 px-2 py-1.5 bg-violet-50 border-b border-violet-200">
        <Pencil className="size-3.5 text-violet-600 shrink-0" />
        <span className="text-xs font-semibold text-violet-700 flex-1 truncate">{data.title || "手書き"}</span>

        <button
          className={`p-1 rounded transition-colors ${tool === "pen" ? "bg-violet-300 text-violet-800" : "hover:bg-violet-200 text-violet-600"}`}
          onClick={() => setTool("pen")}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          title="ペン"
        >
          <Pencil className="size-3.5" />
        </button>

        <button
          className={`p-1 rounded transition-colors ${tool === "eraser" ? "bg-violet-300 text-violet-800" : "hover:bg-violet-200 text-violet-600"}`}
          onClick={() => setTool("eraser")}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          title="消しゴム"
        >
          <Eraser className="size-3.5" />
        </button>

        <input
          type="color"
          value={penColor}
          onChange={(e) => setPenColor(e.target.value)}
          className="w-5 h-5 rounded cursor-pointer border border-violet-200"
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          title="色を選択"
        />

        <button
          className="p-1 rounded hover:bg-red-100 text-red-400 hover:text-red-600 transition-colors"
          onClick={handleClear}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          title="全消去"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>

      {/* 描画キャンバス */}
      <div
        className="nodrag nowheel"
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
      >
        <svg
          ref={svgRef}
          width="100%"
          viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
          style={{
            display: "block",
            height: CANVAS_H,
            background: "#fafafa",
            cursor: tool === "pen" ? "crosshair" : "cell",
            touchAction: "none",
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {allPaths.map((path, i) => (
            <path
              key={i}
              d={pathToD(path.points)}
              stroke={path.color}
              strokeWidth={path.width}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </svg>
      </div>

      <Handle type="source" position={Position.Right} className="!bg-gray-400 !w-3 !h-3" />
    </div>
  );
}

export const DrawingCard = memo(DrawingCardInner);
