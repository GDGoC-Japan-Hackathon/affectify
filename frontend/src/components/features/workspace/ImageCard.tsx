"use client";

import { memo, useRef } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { Image as ImageIcon } from "lucide-react";
import type { BoardNode } from "@/types/type";

type ImageCardNode = Node<BoardNode & Record<string, unknown>, "imageCard">;

function ImageCardInner({ data }: NodeProps<ImageCardNode>) {
  const onCodeChange = (data as Record<string, unknown>).onCodeChange as ((nodeId: string, code: string) => void) | undefined;
  const highlighted = (data as Record<string, unknown>).highlighted as boolean | undefined;
  const inputRef = useRef<HTMLInputElement>(null);

  // code_text stores the base64 data URL of the image
  const imageData = data.code_text || null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      onCodeChange?.(data.id, result);
    };
    reader.readAsDataURL(file);
    // Reset so the same file can be re-selected
    e.target.value = "";
  };

  return (
    <div className={`rounded-lg border-2 shadow-lg overflow-hidden bg-white ${highlighted ? "ring-4 ring-yellow-400" : ""}`} style={{ minWidth: 200, borderColor: highlighted ? "#facc15" : "#f9a8d4" }}>
      <Handle type="target" position={Position.Left} className="!bg-gray-400 !w-3 !h-3" />

      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

      <div className="nowheel" onWheel={(e) => e.stopPropagation()}>
        {imageData ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageData}
            alt={data.title || "画像"}
            className="block max-w-[320px] max-h-[320px] object-contain cursor-move"
            draggable={false}
            onDoubleClick={(e) => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
            title="ドラッグで移動 / ダブルクリックで画像を差し替え"
          />
        ) : (
          <div
            className="flex min-h-[180px] flex-col items-center justify-center gap-2 text-gray-400 cursor-move hover:bg-gray-50 p-10"
            onDoubleClick={(e) => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
            title="ドラッグで移動 / ダブルクリックで画像を選択"
          >
            <ImageIcon className="size-10" />
            <span className="text-xs">ダブルクリックで画像を選択</span>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="!bg-gray-400 !w-3 !h-3" />
    </div>
  );
}

export const ImageCard = memo(ImageCardInner);
