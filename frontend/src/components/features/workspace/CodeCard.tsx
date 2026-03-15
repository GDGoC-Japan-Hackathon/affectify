"use client";

import { memo, useState, useCallback } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Badge } from "@/components/ui/badge";
import type { BoardNode } from "@/types/type";
import { nodeColors } from "@/lib/node-colors";

type CodeCardNode = Node<BoardNode & Record<string, unknown>, "codeCard">;

function CodeCardInner({ data }: NodeProps<CodeCardNode>) {
  const colors = nodeColors[data.kind];
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [code, setCode] = useState(data.code_text ?? "");
  const extra = data as Record<string, unknown>;
  const highlighted = extra.highlighted as boolean | undefined;
  const onCodeChange = extra.onCodeChange as ((nodeId: string, code: string) => void) | undefined;
  const onExpand = extra.onExpand as ((nodeId: string, expanded: boolean) => void) | undefined;

  const codeLines = code.split("\n");

  const handleSave = useCallback(() => {
    onCodeChange?.(data.id, code);
    setEditing(false);
  }, [data.id, code, onCodeChange]);

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
              className="text-[10px] font-bold uppercase px-1.5 py-0 text-white"
              style={{ backgroundColor: colors.badge }}
            >
              {data.kind}
            </Badge>
          </div>
          <h3 className="font-mono font-semibold truncate text-sm">
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
            {/* 変更があるときだけ保存ボタン */}
            {code !== (data.code_text ?? "") && (
              <div className="flex justify-end px-2 pt-1">
                <button
                  className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800 transition-colors px-2 py-1 rounded hover:bg-green-50 font-medium"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSave();
                  }}
                >
                  保存
                </button>
              </div>
            )}

            {/* コード表示（クリックで編集モードに） */}
            <div
              className="max-h-[300px] overflow-auto nowheel nodrag"
              onWheel={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                if (!editing) setEditing(true);
              }}
            >
              {editing ? (
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full min-h-[200px] font-mono text-xs leading-5 p-2 border-0 outline-none resize-both overflow-auto"
                  onMouseDown={(e) => e.stopPropagation()}
                  autoFocus
                />
              ) : (
                <div className="flex font-mono text-xs">
                  <div className="bg-gray-50 px-2 py-2 text-gray-400 select-none border-r border-gray-200 text-right">
                    {codeLines.map((_, i) => (
                      <div key={i} className="leading-5">
                        {i + 1}
                      </div>
                    ))}
                  </div>
                  <pre className="flex-1 px-3 py-2 overflow-x-auto leading-5 whitespace-pre m-0 cursor-text">
                    <code>{code}</code>
                  </pre>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Handle type="source" position={Position.Right} className="!bg-gray-400 !w-3 !h-3" />
    </motion.div>
  );
}

export const CodeCard = memo(CodeCardInner);
