"use client";

import { useEffect, useRef, useState } from "react";
import { Code2, FileCode2, Layers, Search, X } from "lucide-react";
import type { BoardNode } from "@/types/type";

interface NodeSearchBarProps {
  nodes: BoardNode[];
  onSelect: (nodeId: string) => void;
  onClose: () => void;
}

const KIND_ICON: Record<string, React.ReactNode> = {
  function: <Code2 className="size-3.5 text-blue-500" />,
  method: <Code2 className="size-3.5 text-emerald-500" />,
  interface: <Layers className="size-3.5 text-purple-500" />,
  group: <Layers className="size-3.5 text-amber-500" />,
};

function highlight(text: string, query: string) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 text-inherit rounded-sm">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export function NodeSearchBar({ nodes, onSelect, onClose }: NodeSearchBarProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const results = query.trim()
    ? nodes.filter((n) => {
        const q = query.toLowerCase();
        return (
          n.title.toLowerCase().includes(q) ||
          n.file_path.toLowerCase().includes(q) ||
          (n.signature ?? "").toLowerCase().includes(q)
        );
      }).slice(0, 20)
    : [];

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[activeIndex]) {
      onSelect(results[activeIndex].id);
      onClose();
    }
  };

  useEffect(() => {
    const item = listRef.current?.children[activeIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  return (
    <div
      className="absolute inset-0 z-50 flex items-start justify-center pt-16"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        {/* 入力 */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
          <Search className="size-4 shrink-0 text-slate-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="ノードを検索... (title / ファイルパス / シグネチャ)"
            className="flex-1 text-sm text-slate-800 placeholder-slate-400 outline-none bg-transparent"
          />
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100">
            <X className="size-4" />
          </button>
        </div>

        {/* 結果 */}
        {results.length > 0 ? (
          <ul ref={listRef} className="max-h-80 overflow-y-auto py-1">
            {results.map((node, i) => (
              <li key={node.id}>
                <button
                  onMouseDown={() => { onSelect(node.id); onClose(); }}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={`flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors ${
                    i === activeIndex ? "bg-indigo-50" : "hover:bg-slate-50"
                  }`}
                >
                  <span className="mt-0.5 shrink-0">{KIND_ICON[node.kind] ?? <Code2 className="size-3.5 text-slate-400" />}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-800">
                      {highlight(node.title, query)}
                    </div>
                    {node.file_path && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <FileCode2 className="size-3 shrink-0 text-slate-400" />
                        <span className="truncate text-xs text-slate-500">{highlight(node.file_path, query)}</span>
                      </div>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        ) : query.trim() ? (
          <div className="px-4 py-6 text-center text-sm text-slate-500">
            「{query}」に一致するノードが見つかりません
          </div>
        ) : (
          <div className="px-4 py-4 text-center text-xs text-slate-400">
            キーワードを入力して検索
          </div>
        )}

        <div className="border-t border-slate-100 px-4 py-2 flex items-center gap-3 text-xs text-slate-400">
          <span><kbd className="font-mono">↑↓</kbd> 選択</span>
          <span><kbd className="font-mono">Enter</kbd> 移動</span>
          <span><kbd className="font-mono">Esc</kbd> 閉じる</span>
        </div>
      </div>
    </div>
  );
}
