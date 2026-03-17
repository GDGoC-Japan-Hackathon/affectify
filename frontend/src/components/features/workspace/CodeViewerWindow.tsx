"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Editor from "@monaco-editor/react";
import type { OnMount } from "@monaco-editor/react";
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
  onAddNode?: (afterNodeId: string | null, filePath: string, name: string) => void;
  initialPosition?: { x: number; y: number };
  zIndex?: number;
  onFocus?: () => void;
}

export function CodeViewerWindow({ tabs, activeTab, onTabChange, onTabClose, onCloseAll, onDetachTab, onNodeHover, onNodeClick, onCodeSync, onAddNode, initialPosition, zIndex = 9999, onFocus }: CodeViewerWindowProps) {
  const onNodeHoverRef = useRef(onNodeHover);
  onNodeHoverRef.current = onNodeHover;
  const onNodeClickRef = useRef(onNodeClick);
  onNodeClickRef.current = onNodeClick;
  const onCodeSyncRef = useRef(onCodeSync);
  onCodeSyncRef.current = onCodeSync;
  const onAddNodeRef = useRef(onAddNode);
  onAddNodeRef.current = onAddNode;
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  const [copied, setCopied] = useState(false);
  const [isDoubleClickViewEnabled, setIsDoubleClickViewEnabled] = useState(true);
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
  const resizeDir = useRef<"se" | "e" | "s" | "sw" | "w" | "n" | "ne" | "nw">("se");
  const dragOffset = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0, px: 0, py: 0 });
  const headerRef = useRef<HTMLDivElement>(null);
  const editorWrapperRef = useRef<HTMLDivElement>(null);

  // Editor refs
  type IEditor = Parameters<OnMount>[0];
  const editorRef = useRef<IEditor | null>(null);
  const isEditingRef = useRef(false);
  const editingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isProgrammaticRef = useRef(false);
  const decorationsRef = useRef<ReturnType<IEditor["createDecorationsCollection"]> | null>(null);
  const [lh, setLh] = useState(19);
  const [editorScrollTop, setEditorScrollTop] = useState(0);
  const [editorScrollHeight, setEditorScrollHeight] = useState(0);

  // セパレーター行をライブ追跡（編集中もずれない）
  const [liveSeparatorEntries, setLiveSeparatorEntries] = useState<Array<{ lineNum: number; afterNodeId: string | null }>>([]);

  // ポップアップ
  const [addPopup, setAddPopup] = useState<{ screenX: number; screenY: number; afterNodeId: string | null } | null>(null);
  const [newFuncName, setNewFuncName] = useState("");
  const popupInputRef = useRef<HTMLInputElement>(null);

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
    const header = n.kind === "method" ? `// (${n.receiver}).${n.title}` : `// ${n.title}`;
    codeLines.push(header);
    lineNodeMap.push(null);

    const lines = n.code_text?.split("\n") ?? [];
    for (const line of lines) {
      codeLines.push(line);
      lineNodeMap.push(n);
    }
  });

  const fileContent = codeLines.join("\n");

  // 各ノードのヘッダー行番号（1-indexed）
  const headerLineNumbers: number[] = [];
  let lineCounter = 1;
  nodes.forEach((n, i) => {
    if (i > 0) lineCounter++;
    headerLineNumbers.push(lineCounter);
    lineCounter++;
    lineCounter += (n.code_text?.split("\n") ?? []).length;
  });

  const lineNodeMapRef = useRef(lineNodeMap);
  lineNodeMapRef.current = lineNodeMap;

  const fileContentRef = useRef(fileContent);
  fileContentRef.current = fileContent;

  // nodesが変わったときにliveSeparatorEntriesを初期化
  useEffect(() => {
    const entries: Array<{ lineNum: number; afterNodeId: string | null }> = [];
    let lc = 1;
    nodes.forEach((n, i) => {
      if (i > 0) lc++;
      lc++; // header
      lc += (n.code_text?.split("\n") ?? []).length;
      if (i < nodes.length - 1) {
        entries.push({ lineNum: lc, afterNodeId: n.id }); // lc = blank line (next separator)
      }
    });
    setLiveSeparatorEntries(entries);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes.length, activeTab]);

  // External sync effect
  useEffect(() => {
    if (!editorRef.current) return;
    if (editorRef.current.getValue() !== fileContent) {
      isProgrammaticRef.current = true;
      editorRef.current.setValue(fileContent);
      isProgrammaticRef.current = false;
    }
    if (decorationsRef.current) {
      decorationsRef.current.set(lineNodeMap.map((node, i) => (node ? { range: { startLineNumber: i + 1, endLineNumber: i + 1, startColumn: 1, endColumn: 1 }, options: { isWholeLine: true, className: "bg-blue-50" } } : null)).filter((d): d is NonNullable<typeof d> => d !== null));
    }
  }, [fileContent]);

  // ポップアップが開いたらフォーカス
  useEffect(() => {
    if (addPopup) {
      setNewFuncName("");
      setTimeout(() => popupInputRef.current?.focus(), 30);
    }
  }, [addPopup]);

  const handleConfirmAdd = useCallback(() => {
    if (!addPopup) return;
    const name = newFuncName.trim() || "newFunction";
    onAddNodeRef.current?.(addPopup.afterNodeId, activeTabRef.current, name);
    setAddPopup(null);
  }, [addPopup, newFuncName]);

  // ドラッグ処理
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (headerRef.current?.contains(e.target as globalThis.Node)) {
        setIsDragging(true);
        dragOffset.current = { x: e.clientX - position.x, y: e.clientY - position.y };
      }
    },
    [position],
  );

  const handleResizeStart = useCallback(
    (dir: typeof resizeDir.current) => (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      resizeDir.current = dir;
      setIsResizing(true);
      resizeStart.current = { x: e.clientX, y: e.clientY, w: size.width, h: size.height, px: position.x, py: position.y };
    },
    [size, position],
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) setPosition({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
      if (isResizing) {
        const dx = e.clientX - resizeStart.current.x;
        const dy = e.clientY - resizeStart.current.y;
        const dir = resizeDir.current;
        const newW = Math.max(360, resizeStart.current.w + (dir.includes("e") ? dx : dir.includes("w") ? -dx : 0));
        const newH = Math.max(200, resizeStart.current.h + (dir.includes("s") ? dy : dir.includes("n") ? -dy : 0));
        const newX = dir.includes("w") ? resizeStart.current.px + resizeStart.current.w - newW : resizeStart.current.px;
        const newY = dir.includes("n") ? resizeStart.current.py + resizeStart.current.h - newH : resizeStart.current.py;
        setSize({ width: newW, height: newH });
        if (dir.includes("w") || dir.includes("n")) setPosition({ x: newX, y: newY });
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
    <>
      <div style={{ position: "fixed", top: position.y, left: position.x, width: size.width, height: size.height, zIndex }} className="bg-white border-2 border-gray-300 rounded-lg shadow-2xl flex flex-col overflow-hidden" onMouseDown={onFocus}>
        {/* ヘッダー */}
        <div ref={headerRef} onMouseDown={handleMouseDown} className="border-b border-gray-200 bg-gray-50 cursor-move shrink-0">
          <div className="flex items-center justify-between px-3 py-1.5">
            <span className="text-xs text-gray-400">
              {nodes.length} 関数 / {codeLines.length} 行
            </span>
            <div className="flex items-center gap-1">
              <button
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => setIsDoubleClickViewEnabled((prev) => !prev)}
                className={`px-2 py-1 rounded text-[10px] border transition-colors ${
                  isDoubleClickViewEnabled
                    ? "bg-blue-50 border-blue-200 text-blue-700"
                    : "bg-gray-100 border-gray-200 text-gray-500"
                }`}
                title="ダブルクリックで関数を見る"
              >
                ダブルクリックで関数を見る {isDoubleClickViewEnabled ? "ON" : "OFF"}
              </button>
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
              <button onClick={handleCopy} className="p-1 hover:bg-gray-200 rounded transition-colors">
                {copied ? <Check className="size-3.5 text-green-600" /> : <Copy className="size-3.5 text-gray-500" />}
              </button>
              <button onClick={onCloseAll} className="p-1 hover:bg-gray-200 rounded transition-colors" title="すべて閉じる">
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
                <div key={tab.filePath} className={`flex items-center gap-1 px-2 py-1 rounded-t text-xs cursor-pointer shrink-0 ${isActive ? "bg-white border border-b-0 border-gray-200 text-gray-900 font-medium" : "text-gray-500 hover:bg-gray-100"}`} onClick={() => onTabChange(tab.filePath)}>
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

        {/* Monaco Editor + セパレーターヒント */}
        <div ref={editorWrapperRef} className="flex-1 overflow-hidden relative">
          <Editor
            key={activeTab}
            language="go"
            defaultValue={fileContent}
            theme="vs"
            onMount={(editor) => {
              editorRef.current = editor;
              setLh((editor.getOption(63) as unknown as number) || 19);

              decorationsRef.current = editor.createDecorationsCollection(lineNodeMapRef.current.map((node, i) => (node ? { range: { startLineNumber: i + 1, endLineNumber: i + 1, startColumn: 1, endColumn: 1 }, options: { isWholeLine: true, className: "bg-blue-50" } } : null)).filter((d): d is NonNullable<typeof d> => d !== null));

              setEditorScrollHeight(editor.getScrollHeight());
              editor.onDidScrollChange((e) => {
                setEditorScrollTop(e.scrollTop);
                if (e.scrollHeightChanged) setEditorScrollHeight(e.scrollHeight);
              });

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

              editor.onMouseDown((e) => {
                const lineNumber = e.target.position?.lineNumber;
                if (lineNumber == null) return;
                if (isDoubleClickViewEnabled && e.event.detail === 2) {
                  const node = lineNodeMapRef.current[lineNumber - 1];
                  if (node) onNodeClickRef.current?.(node.id);
                }
              });

              editor.onDidChangeModelContent(() => {
                if (isProgrammaticRef.current) return;
                isEditingRef.current = true;
                if (editingTimeoutRef.current) clearTimeout(editingTimeoutRef.current);
                editingTimeoutRef.current = setTimeout(() => {
                  isEditingRef.current = false;
                  editingTimeoutRef.current = null;
                }, 2000);

                const content = editor.getValue();
                const contentLines = content.split("\n");
                const currentNodes = nodesRef.current;

                // ヘッダー行・セパレーター行保護：消されていたら元に戻す
                const expectedHeaders = currentNodes.map((n) => (n.kind === "method" ? `// (${n.receiver}).${n.title}` : `// ${n.title}`));
                const hasAllHeaders = expectedHeaders.every((h) => contentLines.some((l) => l.trim() === h));
                // ヘッダー行以外にも、2つ目以降のヘッダー直前は空白行が必要
                const headerIndices = expectedHeaders.map((h) => contentLines.findIndex((l) => l.trim() === h));
                const hasSeparators = headerIndices.slice(1).every((idx) => idx > 0 && contentLines[idx - 1].trim() === "");
                if (!hasAllHeaders || !hasSeparators) {
                  const savedPosition = editor.getPosition();
                  isProgrammaticRef.current = true;
                  editor.setValue(fileContentRef.current);
                  isProgrammaticRef.current = false;
                  if (savedPosition) editor.setPosition(savedPosition);
                  if (decorationsRef.current) {
                    decorationsRef.current.set(lineNodeMapRef.current.map((node, i) => (node ? { range: { startLineNumber: i + 1, endLineNumber: i + 1, startColumn: 1, endColumn: 1 }, options: { isWholeLine: true, className: "bg-blue-50" } } : null)).filter((d): d is NonNullable<typeof d> => d !== null));
                  }
                  return;
                }

                const headerToNode: Map<string, BoardNode> = new Map();
                for (const n of currentNodes) {
                  const header = n.kind === "method" ? `// (${n.receiver}).${n.title}` : `// ${n.title}`;
                  headerToNode.set(header, n);
                }

                interface NodeSection {
                  nodeId: string;
                  startLine: number;
                }
                const sections: NodeSection[] = [];
                contentLines.forEach((line, idx) => {
                  const node = headerToNode.get(line.trim());
                  if (node) sections.push({ nodeId: node.id, startLine: idx + 1 });
                });
                sections.forEach((section, sIdx) => {
                  const endLine = sIdx + 1 < sections.length ? sections[sIdx + 1].startLine - 2 : contentLines.length - 1;
                  const codeSlice = contentLines.slice(section.startLine, endLine + 1);
                  while (codeSlice.length > 0 && codeSlice[codeSlice.length - 1].trim() === "") codeSlice.pop();
                  onCodeSyncRef.current?.(section.nodeId, codeSlice.join("\n"));
                });

                // セパレーター行をライブ更新（編集中もボタン位置がずれないように）
                const liveEntries = sections.slice(1).map((section, idx) => ({
                  lineNum: section.startLine - 1, // blank line before this header (1-indexed)
                  afterNodeId: sections[idx].nodeId,
                }));
                setLiveSeparatorEntries(liveEntries);
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
              padding: { top: 19, bottom: 19 },
              stickyScroll: { enabled: false },
            }}
          />

          {/* セパレーター行ヒント（関数間の空白行に重ねて表示） + 上下ボタン */}
          {onAddNode && (
            <>
              {/* 一番上：topパディング領域 */}
              <div
                style={{
                  position: "absolute",
                  top: -editorScrollTop,
                  left: 0,
                  right: 0,
                  height: 19,
                  zIndex: 5,
                  display: "flex",
                  alignItems: "center",
                  paddingLeft: 64,
                  cursor: "pointer",
                  userSelect: "none",
                  pointerEvents: "auto",
                }}
                className="group"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setAddPopup({ screenX: e.clientX, screenY: e.clientY + 8, afterNodeId: null });
                }}
              >
                <span className="opacity-70 group-hover:opacity-110 transition-opacity" style={{ color: "#374151", fontSize: 12, fontStyle: "italic", pointerEvents: "none" }}>
                  ⇒ 関数を追加
                </span>
              </div>

              {/* 関数間 */}
              {liveSeparatorEntries.map(({ lineNum, afterNodeId }) => {
                const y = editorRef.current ? editorRef.current.getTopForLineNumber(lineNum) - editorScrollTop : (lineNum - 1) * lh - editorScrollTop;
                return (
                  <div
                    key={lineNum}
                    style={{
                      position: "absolute",
                      top: y,
                      left: 0,
                      right: 0,
                      height: lh,
                      zIndex: 5,
                      display: "flex",
                      alignItems: "center",
                      paddingLeft: 64,
                      cursor: "pointer",
                      userSelect: "none",
                      pointerEvents: "auto",
                    }}
                    className="group"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setAddPopup({
                        screenX: e.clientX,
                        screenY: e.clientY + 8,
                        afterNodeId,
                      });
                    }}
                  >
                    <span className="opacity-70 group-hover:opacity-110 transition-opacity" style={{ color: "#374151", fontSize: 12, fontStyle: "italic", pointerEvents: "none" }}>
                      ⇒ 関数を追加
                    </span>
                  </div>
                );
              })}

              {/* 一番下：bottomパディング領域 */}
              {nodes.length > 0 && editorScrollHeight > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: editorScrollHeight - 19 - editorScrollTop,
                    left: 0,
                    right: 0,
                    height: 19,
                    zIndex: 5,
                    display: "flex",
                    alignItems: "center",
                    paddingLeft: 64,
                    cursor: "pointer",
                    userSelect: "none",
                    pointerEvents: "auto",
                  }}
                  className="group"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setAddPopup({ screenX: e.clientX, screenY: e.clientY + 8, afterNodeId: nodes[nodes.length - 1].id });
                  }}
                >
                  <span className="opacity-70 group-hover:opacity-110 transition-opacity" style={{ color: "#374151", fontSize: 12, fontStyle: "italic", pointerEvents: "none" }}>
                    ⇒ 関数を追加
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* リサイズハンドル（各辺＋各角） */}
        {/* 右辺 */}
        <div onMouseDown={handleResizeStart("e")} className="absolute top-4 bottom-4 right-0 w-3 cursor-e-resize hover:bg-blue-300/30" />
        {/* 左辺 */}
        <div onMouseDown={handleResizeStart("w")} className="absolute top-4 bottom-4 left-0 w-3 cursor-w-resize hover:bg-blue-300/30" />
        {/* 下辺 */}
        <div onMouseDown={handleResizeStart("s")} className="absolute bottom-0 left-4 right-4 h-3 cursor-s-resize hover:bg-blue-300/30" />
        {/* 上辺 */}
        <div onMouseDown={handleResizeStart("n")} className="absolute top-0 left-4 right-4 h-3 cursor-n-resize hover:bg-blue-300/30" />
        {/* 右下角 */}
        <div onMouseDown={handleResizeStart("se")} className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize" style={{ background: "linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.15) 50%)" }} />
        {/* 左下角 */}
        <div onMouseDown={handleResizeStart("sw")} className="absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize" />
        {/* 右上角 */}
        <div onMouseDown={handleResizeStart("ne")} className="absolute top-0 right-0 w-4 h-4 cursor-ne-resize" />
        {/* 左上角 */}
        <div onMouseDown={handleResizeStart("nw")} className="absolute top-0 left-0 w-4 h-4 cursor-nw-resize" />
      </div>

      {/* 関数追加ポップアップ */}
      {addPopup && (
        <div style={{ position: "fixed", left: addPopup.screenX, top: addPopup.screenY, transform: "translateX(-50%)", zIndex: zIndex + 10 }} className="bg-white border border-gray-300 rounded-lg shadow-xl px-3 py-2.5 flex flex-col gap-2 w-52" onMouseDown={(e) => e.stopPropagation()}>
          <span className="text-xs text-gray-500 font-medium">関数名を入力</span>
          <input
            ref={popupInputRef}
            className="text-sm border border-gray-300 rounded px-2 py-1 outline-none focus:border-blue-400"
            placeholder="newFunction"
            value={newFuncName}
            onChange={(e) => setNewFuncName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleConfirmAdd();
              if (e.key === "Escape") setAddPopup(null);
            }}
          />
          <div className="flex gap-1 justify-end">
            <button className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 transition-colors" onClick={() => setAddPopup(null)}>
              キャンセル
            </button>
            <button className="text-xs px-2 py-1 rounded bg-blue-500 hover:bg-blue-600 text-white transition-colors" onClick={handleConfirmAdd}>
              追加
            </button>
          </div>
        </div>
      )}
    </>
  );
}
