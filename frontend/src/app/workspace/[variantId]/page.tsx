"use client";

import { Whiteboard } from "@/components/features/workspace/Whiteboard";
import { mockNodes, mockNodesLarge } from "@/data/mock-nodes";
import { mockEdges, mockEdgesLarge } from "@/data/mock-edges";

export default function WorkspacePage() {
  // TODO: useParams() で variantId を取得し API からノード/エッジを取得する
  // 現在はモックデータを使用
  const useLargeMock = true;

  return (
    <div className="w-screen h-screen">
      <Whiteboard
        boardNodes={useLargeMock ? mockNodesLarge : mockNodes}
        boardEdges={useLargeMock ? mockEdgesLarge : mockEdges}
      />
    </div>
  );
}
