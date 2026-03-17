"use client";

import { Whiteboard } from "@/components/features/workspace/Whiteboard";
import { mockNodes, mockNodesLarge } from "@/data/mock-nodes";
import { mockEdges, mockEdgesLarge } from "@/data/mock-edges";

export default function WorkspacePage() {
  // 既存モックを残しつつ、必要な時だけ大規模モックに切り替え
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
