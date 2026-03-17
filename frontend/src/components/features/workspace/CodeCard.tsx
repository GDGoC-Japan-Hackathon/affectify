"use client";

import { memo, useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { ChevronDown, ChevronRight, FunctionSquare, Cog, Puzzle, Folder, StickyNote, Image } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Badge } from "@/components/ui/badge";
import type { BoardNode } from "@/types/type";
import { nodeColors } from "@/lib/node-colors";

type CodeCardNode = Node<BoardNode & Record<string, unknown>, "codeCard">;

function CodeCardInner({ data }: NodeProps<CodeCardNode>) {
  const colors = nodeColors[data.kind];
  const [expanded, setExpanded] = useState(false);
  const [code, setCode] = useState(data.code_text ?? "");
  const extra = data as Record<string, unknown>;
  const highlighted = extra.highlighted as boolean | undefined;
  const onCodeChange = extra.onCodeChange as ((nodeId: string, code: string) => void) | undefined;
  const onExpand = extra.onExpand as ((nodeId: string, expanded: boolean) => void) | undefined;
  const edgeCount = (extra.edgeCount as number) ?? 0;
  const closeAllCounter = (extra.closeAllCounter as number) ?? 0;

  // closeAllCounterが変わったら閉じる
  const prevCloseAll = useRef(closeAllCounter);
  useEffect(() => {
    if (closeAllCounter !== prevCloseAll.current) {
      prevCloseAll.current = closeAllCounter;
      setExpanded(false);
    }
  }, [closeAllCounter]);

  // ファイルビューアからの編集を反映
  useEffect(() => {
    setCode(data.code_text ?? "");
  }, [data.code_text]);

  const lineCount = (data.code_text ?? "").split("\n").length;

  const kindIcons: Record<string, React.ReactNode> = {
    function: <FunctionSquare className="size-4" />,
    method: <Cog className="size-4" />,
    interface: <Puzzle className="size-4" />,
    group: <Folder className="size-4" />,
    note: <StickyNote className="size-4" />,
    image: <Image className="size-4" />,
  };

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`
        ${expanded ? "w-[500px]" : "min-w-[220px] max-w-[320px]"}
        rounded-lg border-2 shadow-lg backdrop-blur-sm cursor-pointer
        ${highlighted ? "ring-4 ring-yellow-400 shadow-yellow-400/50" : ""}
      `}
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.85)",
        borderColor: highlighted ? "#facc15" : colors.border,
        transition: "box-shadow 0.2s, border-color 0.2s",
      }}
    >
      <Handle type="target" position={Position.Left} className="!bg-gray-400 !w-3 !h-3" />

      {/* ヘッダー */}
      <div
        className="p-3 flex items-start gap-2 cursor-pointer hover:bg-black/5 rounded-t-lg"
        onClick={(e) => {
          e.stopPropagation();
          const next = !expanded;
          setExpanded(next);
          setTimeout(() => onExpand?.(data.id, next), 10);
        }}
      >
        <div className="shrink-0 pt-0.5">
          {expanded ? (
            <ChevronDown className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge
              className="text-[10px] font-bold uppercase px-1.5 py-0 bg-transparent border"
              style={{ color: colors.badge, borderColor: colors.badge }}
            >
              {data.kind}
            </Badge>
            {lineCount > 0 && (
              <Badge className="text-[10px] px-1.5 py-0 bg-gray-100 text-gray-600 border border-gray-200">
                {lineCount} 行
              </Badge>
            )}
            {edgeCount > 0 && (
              <Badge className="text-[10px] px-1.5 py-0 bg-gray-100 text-gray-600 border border-gray-200">
                依存 {edgeCount}
              </Badge>
            )}
          </div>
          <h3 className="font-mono font-semibold truncate text-sm flex items-center gap-1.5">
            <span className="text-gray-500">{kindIcons[data.kind]}</span>
            {data.receiver ? `(${data.receiver}).` : ""}
            {data.title}
          </h3>
          {data.file_path && (
            <p className="text-xs text-gray-500 truncate">{data.file_path}</p>
          )}
        </div>
      </div>

      {/* 展開部分 */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t"
            style={{ borderColor: colors.border }}
          >
            {/* コードエディタ（常にMonaco） */}
            <div
              className="nowheel nodrag"
              style={{ height: Math.min(Math.max(code.split("\n").length * 20 + 20, 80), 400) }}
              onWheel={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <Editor
                height="100%"
                language="go"
                value={code}
                onChange={(v) => {
                  setCode(v ?? "");
                  onCodeChange?.(data.id, v ?? "");
                }}
                theme="vs"
                options={{
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  fontSize: 12,
                  lineNumbers: "on",
                  scrollbar: { verticalScrollbarSize: 6 },
                  automaticLayout: true,
                }}
              />
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      <Handle type="source" position={Position.Right} className="!bg-gray-400 !w-3 !h-3" />
    </motion.div>
  );
}

export const CodeCard = memo(CodeCardInner);
