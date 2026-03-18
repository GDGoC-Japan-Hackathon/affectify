"use client";

import { useState } from "react";
import { Whiteboard } from "@/components/features/workspace/Whiteboard";
import { mockNodes, mockNodesLarge } from "@/data/mock-nodes";
import { mockEdges, mockEdgesLarge } from "@/data/mock-edges";
import { AIReviewProvider } from "@/components/features/ai-review/AIReviewContext";
import { AIReviewSidePanel } from "@/components/features/ai-review/AIReviewSidePanel";
import { AIReviewModal } from "@/components/features/ai-review/AIReviewModal";

export default function WorkspacePage() {

  // const { variantId } = useParams();
  const [highlightedNodeIds, setHighlightedNodeIds] = useState<Set<string>>(new Set());
  const [highlightedEdgeIds, setHighlightedEdgeIds] = useState<Set<string>>(new Set());

  // TODO: variantId を使って API からノード/エッジを取得する
  const useLargeMock = true;

  return (
    <AIReviewProvider>
      <div className="flex h-screen w-screen">
        {/* キャンバス */}
        <div className="flex-1 overflow-hidden">
          <Whiteboard
            boardNodes={useLargeMock ? mockNodesLarge : mockNodes}
            boardEdges={useLargeMock ? mockEdgesLarge : mockEdges}
            highlightedNodeIds={highlightedNodeIds}
            highlightedEdgeIds={highlightedEdgeIds}
          />
        </div>

        {/* AIレビュー右パネル */}
        <AIReviewSidePanel
          onHighlightNodes={(nodeIds, edgeIds) => {
            setHighlightedNodeIds(new Set(nodeIds));
            setHighlightedEdgeIds(new Set(edgeIds));
          }}
          onClearHighlight={() => {
            setHighlightedNodeIds(new Set());
            setHighlightedEdgeIds(new Set());
          }}
        />
      </div>

      {/* 全画面モーダル */}
      <AIReviewModal
        onViewNodes={(nodeIds, edgeIds) => {
          setHighlightedNodeIds(new Set(nodeIds));
          setHighlightedEdgeIds(new Set(edgeIds));
        }}
      />
    </AIReviewProvider>
  );
}
