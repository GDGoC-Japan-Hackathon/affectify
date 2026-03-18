"use client";

import { memo, useState, useEffect } from "react";
import { type NodeProps, type Node } from "@xyflow/react";
import type { BoardNode } from "@/types/type";

type MemoCardNode = Node<BoardNode & Record<string, unknown>, "memoCard">;

function MemoCardInner({ data }: NodeProps<MemoCardNode>) {
  const [text, setText] = useState(data.code_text ?? "");
  const [isEditing, setIsEditing] = useState(false);
  const onCodeChange = (data as Record<string, unknown>).onCodeChange as ((nodeId: string, code: string) => void) | undefined;
  const highlighted = (data as Record<string, unknown>).highlighted as boolean | undefined;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setText(data.code_text ?? "");
  }, [data.code_text]);

  return (
    <div
      className={`w-[200px] rounded-sm shadow-md overflow-hidden ${highlighted ? "ring-4 ring-yellow-400" : ""}`}
      style={{ backgroundColor: "#fef08a", border: "1px solid #fde047" }}
    >
      {/* 付箋上部の折り目ライン */}
      <div className="h-1 w-full" style={{ backgroundColor: "#fde047" }} />

      {isEditing ? (
        <textarea
          autoFocus
          className="nowheel nodrag w-full p-3 bg-transparent text-sm text-gray-800 resize-none focus:outline-none placeholder:text-yellow-700/50"
          value={text}
          placeholder="メモを入力..."
          rows={6}
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
          className="w-full min-h-[120px] p-3 text-sm text-gray-800 whitespace-pre-wrap break-words cursor-move"
          onDoubleClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
          title="ドラッグで移動 / ダブルクリックで編集"
        >
          {text.trim() ? text : <span className="text-yellow-700/50">メモを入力...</span>}
        </div>
      )}
    </div>
  );
}

export const MemoCard = memo(MemoCardInner);
