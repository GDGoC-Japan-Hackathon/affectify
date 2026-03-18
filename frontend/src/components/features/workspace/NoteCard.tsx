"use client";

import { memo, useState, useEffect } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { FileText } from "lucide-react";
import type { BoardNode } from "@/types/type";

type NoteCardNode = Node<BoardNode & Record<string, unknown>, "noteCard">;

function NoteCardInner({ data }: NodeProps<NoteCardNode>) {
  const [text, setText] = useState(data.code_text ?? "");
  const [isEditing, setIsEditing] = useState(false);
  const onCodeChange = (data as Record<string, unknown>).onCodeChange as ((nodeId: string, code: string) => void) | undefined;
  const highlighted = (data as Record<string, unknown>).highlighted as boolean | undefined;

  useEffect(() => {
    setText(data.code_text ?? "");
  }, [data.code_text]);

  return (
    <div className={`w-[260px] rounded-md shadow-md overflow-hidden bg-white border-2 ${highlighted ? "ring-4 ring-yellow-400" : ""}`} style={{ borderColor: "#facc15" }}>
      <Handle type="target" position={Position.Left} className="!bg-gray-400 !w-3 !h-3" />

      {/* ヘッダー */}
      <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ backgroundColor: "#fef9c3", borderColor: "#fde047" }}>
        <FileText className="size-4 shrink-0" style={{ color: "#ca8a04" }} />
        <span className="text-xs font-semibold truncate text-gray-700">{data.title || "ドキュメント"}</span>
        {data.file_path ? (
          <span className="ml-auto text-[10px] text-gray-400 truncate max-w-[100px]">{data.file_path}</span>
        ) : null}
      </div>

      {/* 本文 */}
      {isEditing ? (
        <textarea
          autoFocus
          className="nowheel nodrag w-full p-3 text-sm text-gray-800 resize-none focus:outline-none"
          value={text}
          placeholder="ドキュメントの内容"
          rows={8}
          onChange={(e) => {
            setText(e.target.value);
            onCodeChange?.(data.id, e.target.value);
          }}
          onBlur={() => setIsEditing(false)}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
        />
      ) : (
        <div
          className="w-full min-h-[120px] p-3 text-sm text-gray-700 whitespace-pre-wrap break-words cursor-move"
          onDoubleClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
          title="ドラッグで移動 / ダブルクリックで編集"
        >
          {text.trim() ? text : <span className="text-gray-400">内容を追加</span>}
        </div>
      )}

      <Handle type="source" position={Position.Right} className="!bg-gray-400 !w-3 !h-3" />
    </div>
  );
}

export const NoteCard = memo(NoteCardInner);
