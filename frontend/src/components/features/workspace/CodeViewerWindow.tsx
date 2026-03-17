"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Editor from "@monaco-editor/react";
import { X, FileCode, Copy, Check, ExternalLink, Maximize2, Minimize2 } from "lucide-react";
import type { BoardNode } from "@/types/type";

interface TabFile {
  filePath: string;
  nodes: BoardNode[];
}

interface CodeViewerWindowProps {
  tabs: TabFile[];
  activeTab: string;
  onTabChange: (filePath: string) => void;
  onTabClose: (filePath: string) => void;
  onCloseAll: () => void;
  onDetachTab?: (filePath: string) => void;
  onNodeHover?: (nodeId: string | null) => void;
  onNodeClick?: (nodeId: string) => void;
  onCodeSync?: (nodeId: string, code: string) => void;
  initialPosition?: { x: number; y: number };
  zIndex?: number;
  onFocus?: () => void;
}

export function CodeViewerWindow({
  tabs,
  activeTab,
  onTabChange,
  onTabClose,
  onCloseAll,
  onDetachTab,
  onNodeHover,
  onNodeClick,
  onCodeSync,
  initialPosition,
  zIndex = 9999,
  onFocus,
}: CodeViewerWindowProps) {
  const onNodeHoverRef = useRef(onNodeHover);
  onNodeHoverRef.current = onNodeHover;
  const onNodeClickRef = useRef(onNodeClick);
  onNodeClickRef.current = onNodeClick;
  const onCodeSyncRef = useRef(onCodeSync);
  onCodeSyncRef.current = onCodeSync;

  const [copied, setCopied] = useState(false);
  const [position, setPosition] = useState(() => {
    if (initialPosition) return initialPosition;
    const x = typeof window !== "undefined" ? Math.max(100, window.innerWidth - 600) : 100;
    return { x, y: 80 };
  });
  const defaultSize = { width: 560, height: 460 };
  const [size, setSize] = useState(defaultSize);
  const [isSmall, setIsSmall] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const headerRef = useRef<HTMLDivElement>(null);


  // Editor ref for bidirectional sync
  const editorRef = useRef<any>(null);
  const isEditingRef = useRef(false);
  const editingTimeoutRef = useRef<any>(null);
  const isProgrammaticRef = useRef(false);
  const decorationsRef = useRef<any>(null);

  const activeFile = tabs.find((t) => t.filePath === activeTab);
  const nodes = activeFile?.nodes ?? [];
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  // コード結合 + 行マッピング
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
    lineNodeMap.push(null);

    const lines = n.code_text?.split("\n") ?? [];
    for (const line of lines) {
      codeLines.push(line);
      lineNodeMap.push(n);
    }
  });

  const fileContent = codeLines.join("\n");

  // Ref for lineNodeMap to avoid stale closures
  const lineNodeMapRef = useRef(lineNodeMap);
  lineNodeMapRef.current = lineNodeMap;

  // External sync effect: when fileContent changes, update editor value and reapply decorations
  useEffect(() => {
    if (!editorRef.current) return;
    if (editorRef.current.getValue() !== fileContent) {
      isProgrammaticRef.current = true;
      editorRef.current.setValue(fileContent);
      isProgrammaticRef.current = false;
    }
    // デコレーションを再適用（setValue後に消えるため）
    if (decorationsRef.current) {
      decorationsRef.current.set(
        lineNodeMap
          .map((node, i) =>
            node ? { range: { startLineNumber: i + 1, endLineNumber: i + 1, startColumn: 1, endColumn: 1 }, options: { isWholeLine: true, className: "bg-blue-50" } } : null
          )
          .filter(Boolean)
      );
    }
  }, [fileContent]);

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

  if (tabs.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: position.y,
        left: position.x,
        width: size.width,
        height: size.height,
        zIndex,
      }}
      className="bg-white border-2 border-gray-300 rounded-lg shadow-2xl flex flex-col overflow-hidden"
      onMouseDown={onFocus}
    >
      {/* ヘッダー（ドラッグハンドル） */}
      <div
        ref={headerRef}
        onMouseDown={handleMouseDown}
        className="border-b border-gray-200 bg-gray-50 cursor-move shrink-0"
      >
        {/* 上部：コピー・全閉じボタン */}
        <div className="flex items-center justify-between px-3 py-1.5">
          <span className="text-xs text-gray-400">
            {nodes.length} 関数 / {codeLines.length} 行
          </span>
          <div className="flex items-center gap-1">
            {isSmall ? (
              <button
                onClick={() => {
                  setSize(defaultSize);
                  setIsSmall(false);
                }}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                title="元のサイズに戻す"
              >
                <Maximize2 className="size-3.5 text-gray-500" />
              </button>
            ) : (
              <button
                onClick={() => {
                  setSize({ width: 360, height: 250 });
                  setIsSmall(true);
                }}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                title="小さくする"
              >
                <Minimize2 className="size-3.5 text-gray-500" />
              </button>
            )}
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
              onClick={onCloseAll}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              title="すべて閉じる"
            >
              <X className="size-3.5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* タブバー */}
        <div className="flex items-center overflow-x-auto px-1 pb-1 gap-0.5">
          {tabs.map((tab) => {
            const name = tab.filePath.split("/").pop() ?? tab.filePath;
            const isActive = tab.filePath === activeTab;
            return (
              <div
                key={tab.filePath}
                className={`flex items-center gap-1 px-2 py-1 rounded-t text-xs cursor-pointer shrink-0 ${
                  isActive
                    ? "bg-white border border-b-0 border-gray-200 text-gray-900 font-medium"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
                onClick={() => onTabChange(tab.filePath)}
              >
                <FileCode className="size-3 text-green-600 shrink-0" />
                <span className="truncate max-w-[120px]">{name}</span>
                {onDetachTab && tabs.length > 1 && (
                  <button
                    className="ml-0.5 p-0.5 rounded hover:bg-gray-300/50 transition-colors"
                    title="新しいウィンドウに移動"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDetachTab(tab.filePath);
                    }}
                  >
                    <ExternalLink className="size-3" />
                  </button>
                )}
                <button
                  className="ml-0.5 p-0.5 rounded hover:bg-gray-300/50 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTabClose(tab.filePath);
                  }}
                >
                  <X className="size-3" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* コード表示部分（Monaco Editor） */}
      <div className="flex-1 overflow-hidden">
        <Editor
          key={activeTab}
          language="go"
          defaultValue={fileContent}
          theme="vs"
          onMount={(editor) => {
            editorRef.current = editor;

            // 関数ごとの背景色デコレーション
            const buildDecorations = () =>
              lineNodeMapRef.current
                .map((node, i) =>
                  node ? { range: { startLineNumber: i + 1, endLineNumber: i + 1, startColumn: 1, endColumn: 1 }, options: { isWholeLine: true, className: "bg-blue-50" } } : null
                )
                .filter(Boolean) as any[];
            decorationsRef.current = editor.createDecorationsCollection(buildDecorations());

            // ホバーでハイライト
            editor.onMouseMove((e) => {
              const lineNumber = e.target.position?.lineNumber;
              if (lineNumber != null) {
                const node = lineNodeMapRef.current[lineNumber - 1];
                onNodeHoverRef.current?.(node?.id ?? null);
              }
            });

            editor.onMouseLeave(() => {
              onNodeHoverRef.current?.(null);
            });

            // ダブルクリックでノードにジャンプ
            editor.onMouseDown((e) => {
              if (e.event.detail === 2) {
                const lineNumber = e.target.position?.lineNumber;
                if (lineNumber != null) {
                  const node = lineNodeMapRef.current[lineNumber - 1];
                  if (node) onNodeClickRef.current?.(node.id);
                }
              }
            });

            // Bidirectional sync: parse content and call onCodeSync for each node
            editor.onDidChangeModelContent(() => {
              if (isProgrammaticRef.current) return;
              isEditingRef.current = true;
              if (editingTimeoutRef.current) {
                clearTimeout(editingTimeoutRef.current);
              }
              editingTimeoutRef.current = setTimeout(() => {
                isEditingRef.current = false;
                editingTimeoutRef.current = null;
              }, 2000);

              const content = editor.getValue();
              const contentLines = content.split("\n");
              const currentNodes = nodesRef.current;

              // Build a map of header -> nodeId for quick lookup
              const headerToNode: Map<string, BoardNode> = new Map();
              for (const n of currentNodes) {
                const header =
                  n.kind === "method"
                    ? `// (${n.receiver}).${n.title}`
                    : `// ${n.title}`;
                headerToNode.set(header, n);
              }

              // Find each node's header in the content and extract its code
              interface NodeSection {
                nodeId: string;
                startLine: number; // 0-indexed, line after header
              }
              const sections: NodeSection[] = [];

              contentLines.forEach((line, idx) => {
                const node = headerToNode.get(line.trim());
                if (node) {
                  sections.push({ nodeId: node.id, startLine: idx + 1 });
                }
              });

              sections.forEach((section, sIdx) => {
                const endLine = sIdx + 1 < sections.length ? sections[sIdx + 1].startLine - 2 : contentLines.length - 1;
                const codeSlice = contentLines.slice(section.startLine, endLine + 1);
                // Trim trailing blank lines
                while (codeSlice.length > 0 && codeSlice[codeSlice.length - 1].trim() === "") {
                  codeSlice.pop();
                }
                const code = codeSlice.join("\n");
                onCodeSyncRef.current?.(section.nodeId, code);
              });
            });
          }}
          options={{
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 14,
            lineNumbers: "on",
            scrollbar: { verticalScrollbarSize: 6 },
            automaticLayout: true,
            renderLineHighlight: "none",
          }}
        />
      </div>

      {/* リサイズハンドル（右下） */}
      <div
        onMouseDown={handleResizeStart}
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
        style={{
          background:
            "linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.15) 50%)",
        }}
      />
    </div>
  );
}
