"use client";

import { memo, useState } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { ChevronDown, ChevronRight, Code, FileText, Box, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import type { BoardNode } from "@/types/type";

type FunctionNodeCardNode = Node<BoardNode & Record<string, unknown>, "functionNodeCard">;

const kindColor: Record<string, { bg: string; border: string; badge: string }> = {
  function:  { bg: "bg-green-500/20",  border: "border-green-500",  badge: "bg-green-500"  },
  method:    { bg: "bg-blue-500/20",   border: "border-blue-500",   badge: "bg-blue-500"   },
  interface: { bg: "bg-purple-500/20", border: "border-purple-500", badge: "bg-purple-500" },
  group:     { bg: "bg-amber-500/20",  border: "border-amber-500",  badge: "bg-amber-500"  },
  note:      { bg: "bg-yellow-500/20", border: "border-yellow-500", badge: "bg-yellow-500" },
  image:     { bg: "bg-pink-500/20",   border: "border-pink-500",   badge: "bg-pink-500"   },
};

function getIcon(kind: string) {
  switch (kind) {
    case "note":  return <FileText className="size-4" />;
    case "image": return <ImageIcon className="size-4" />;
    case "group": return <Box className="size-4" />;
    default:      return <Code className="size-4" />;
  }
}

function FunctionNodeCardInner({ data }: NodeProps<FunctionNodeCardNode>) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [code, setCode] = useState(data.code_text ?? "");

  const colors = kindColor[data.kind] ?? kindColor["function"];
  const codeLines = code.split("\n");

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`
        ${isExpanded ? "min-w-[300px] max-w-[600px]" : "min-w-[200px] max-w-[300px]"}
        rounded-lg border-2 shadow-lg backdrop-blur-sm cursor-pointer
        ${colors.bg} ${colors.border}
      `}
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-400 !w-3 !h-3" />

      {/* ヘッダー */}
      <div
        className="p-3 flex items-start gap-2 cursor-pointer hover:bg-black/5"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="shrink-0 pt-0.5">
          {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {getIcon(data.kind)}
            <h3 className="font-mono font-semibold truncate">{data.title}</h3>
          </div>

          <div className="flex flex-wrap gap-1">
            {/* kind バッジ */}
            <span className={`text-xs text-white font-bold px-2 py-0.5 rounded-full ${colors.badge}`}>
              {data.kind}
            </span>
            {/* ファイルパス */}
            {data.file_path && (
              <span className="text-xs text-gray-500 truncate max-w-[150px]">
                {data.file_path}
              </span>
            )}
          </div>

          {/* シグネチャ */}
          {data.signature && (
            <p className="font-mono text-xs text-gray-500 truncate mt-1">{data.signature}</p>
          )}
        </div>
      </div>

      {/* 展開コンテンツ */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-current/20"
          >
            <div className="p-3 space-y-2">
              {/* レシーバー */}
              {data.receiver && (
                <p className="text-xs text-gray-600">
                  <span className="font-semibold">receiver: </span>{data.receiver}
                </p>
              )}

              {/* コード */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <p className="text-xs font-semibold">コード:</p>
                  <button
                    className="text-xs px-2 py-0.5 rounded hover:bg-black/10"
                    onClick={(e) => { e.stopPropagation(); setIsEditing(!isEditing); }}
                  >
                    {isEditing ? "キャンセル" : "編集"}
                  </button>
                </div>

                {isEditing ? (
                  <div
                    className="space-y-2 nowheel"
                    onClick={(e) => e.stopPropagation()}
                    onWheel={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <textarea
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="w-full font-mono text-xs min-h-[200px] bg-black/10 border border-gray-300 rounded p-2 nowheel resize-none"
                      onWheel={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                    />
                    <button
                      className="w-full text-xs bg-gray-800 text-white py-1 rounded hover:bg-gray-700"
                      onClick={(e) => { e.stopPropagation(); setIsEditing(false); }}
                    >
                      保存
                    </button>
                  </div>
                ) : (
                  <div
                    className="bg-white/90 rounded border border-gray-200 overflow-hidden max-h-[300px] overflow-y-auto nowheel"
                    onWheel={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex font-mono text-xs">
                      {/* 行番号 */}
                      <div className="bg-gray-50 px-3 py-2 text-gray-400 select-none border-r border-gray-200">
                        {codeLines.map((_, i) => (
                          <div key={i} className="leading-5 text-right">{i + 1}</div>
                        ))}
                      </div>
                      {/* コード本文 */}
                      <pre className="flex-1 px-3 py-2 overflow-x-auto">
                        <code className="leading-5">{code}</code>
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Handle type="source" position={Position.Bottom} className="!bg-gray-400 !w-3 !h-3" />
    </motion.div>
  );
}

export const FunctionNodeCard = memo(FunctionNodeCardInner);
