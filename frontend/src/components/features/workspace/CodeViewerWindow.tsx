"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, FileCode, Copy, Check, Minimize2, Maximize2 } from "lucide-react";
import type { BoardNode } from "@/types/type";

interface CodeViewerWindowProps {
  filePath: string;
  nodes: BoardNode[];
  index?: number;
  onClose: () => void;
  onNodeHover?: (nodeId: string | null) => void;
  onNodeClick?: (nodeId: string) => void;
}

export function CodeViewerWindow({
  filePath,
  nodes,
  index = 0,
  onClose,
  onNodeHover,
  onNodeClick,
}: CodeViewerWindowProps) {
  const [copied, setCopied] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 80 });
  const [size, setSize] = useState({ width: 560, height: 460 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const headerRef = useRef<HTMLDivElement>(null);

  // 初期位置をウィンドウ右寄り + indexでずらす
  useEffect(() => {
    const offset = index * 30;
    setPosition({
      x: Math.max(100, window.innerWidth - 600 - offset),
      y: 80 + offset,
    });
  }, [index]);

  // ファイル内の全ノードのコードを結合しつつ、各行がどのノードに属するか記録
  const codeLines: string[] = [];
  const lineNodeMap: (BoardNode | null)[] = [];

  nodes.forEach((n, idx) => {
    if (idx > 0) {
      codeLines.push("");
      lineNodeMap.push(null);
    }
    const header =
      n.kind === "method"
        ? `// (${n.receiver}).${n.title}`
        : `// ${n.title}`;
    codeLines.push(header);
    lineNodeMap.push(null); // コメント行はホバー対象外

    const lines = n.code_text?.split("\n") ?? [];
    for (const line of lines) {
      codeLines.push(line);
      lineNodeMap.push(n); // コード行はこのノードに属する
    }
  });

  const fileContent = codeLines.join("\n");
  const fileName = filePath.split("/").pop() ?? filePath;

  // ドラッグ処理
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (headerRef.current?.contains(e.target as globalThis.Node)) {
        setIsDragging(true);
        dragOffset.current = {
          x: e.clientX - position.x,
          y: e.clientY - position.y,
        };
      }
    },
    [position]
  );

  // リサイズ処理
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);
      resizeStart.current = {
        x: e.clientX,
        y: e.clientY,
        w: size.width,
        h: size.height,
      };
    },
    [size]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.current.x,
          y: e.clientY - dragOffset.current.y,
        });
      }
      if (isResizing) {
        setSize({
          width: Math.max(360, resizeStart.current.w + e.clientX - resizeStart.current.x),
          height: Math.max(200, resizeStart.current.h + e.clientY - resizeStart.current.y),
        });
      }
    };
    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };
    if (isDragging || isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, isResizing]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(fileContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };


  return (
    <div
      style={{
        position: "fixed",
        top: position.y,
        left: position.x,
        width: size.width,
        height: minimized ? 48 : size.height,
        zIndex: 9999,
      }}
      className="bg-white border-2 border-gray-300 rounded-lg shadow-2xl flex flex-col overflow-hidden"
    >
      {/* ヘッダー（ドラッグハンドル） */}
      <div
        ref={headerRef}
        onMouseDown={handleMouseDown}
        className="px-3 py-2 border-b border-gray-200 bg-gray-50 cursor-move flex items-center justify-between shrink-0"
      >
        <div className="flex items-center gap-2">
          <FileCode className="size-4 text-green-600" />
          <span className="font-semibold text-sm font-mono truncate">
            {fileName}
          </span>
          <span className="text-xs text-gray-400">
            {nodes.length} 関数 / {codeLines.length} 行
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
          >
            {copied ? (
              <Check className="size-3.5 text-green-600" />
            ) : (
              <Copy className="size-3.5 text-gray-500" />
            )}
          </button>
          <button
            onClick={() => setMinimized((v) => !v)}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
          >
            {minimized ? (
              <Maximize2 className="size-3.5 text-gray-500" />
            ) : (
              <Minimize2 className="size-3.5 text-gray-500" />
            )}
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
          >
            <X className="size-3.5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* コード表示部分 */}
      {!minimized && (
        <div className="flex-1 overflow-auto bg-gray-50">
          <div className="flex font-mono text-xs">
            {/* 行番号 */}
            <div className="bg-gray-100 px-3 py-2 text-gray-400 select-none border-r border-gray-200 sticky left-0">
              {codeLines.map((_, i) => (
                <div key={i} className="leading-5 text-right">
                  {i + 1}
                </div>
              ))}
            </div>
            {/* コード */}
            <pre className="flex-1 px-3 py-2 overflow-x-auto">
              {codeLines.map((line, i) => {
                const node = lineNodeMap[i];
                return (
                  <div
                    key={i}
                    className={`leading-5 ${
                      node
                        ? "bg-blue-50 -mx-1 px-1 rounded cursor-pointer hover:bg-blue-100 transition-colors"
                        : ""
                    }`}
                    onMouseEnter={() => node && onNodeHover?.(node.id)}
                    onMouseLeave={() => node && onNodeHover?.(null)}
                    onClick={() => node && onNodeClick?.(node.id)}
                  >
                    <code>{line || " "}</code>
                  </div>
                );
              })}
            </pre>
          </div>
        </div>
      )}

      {/* リサイズハンドル（右下） */}
      {!minimized && (
        <div
          onMouseDown={handleResizeStart}
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
          style={{
            background:
              "linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.15) 50%)",
          }}
        />
      )}
    </div>
  );
}
