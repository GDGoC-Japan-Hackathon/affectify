"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Whiteboard } from "@/components/features/workspace/Whiteboard";
import { getVariantWorkspace } from "@/lib/api/variants";
import { AIReviewProvider } from "@/components/features/ai-review/AIReviewContext";
import { AIReviewSidePanel } from "@/components/features/ai-review/AIReviewSidePanel";
import { AIReviewModal } from "@/components/features/ai-review/AIReviewModal";
import type { BoardEdge, BoardNode } from "@/types/type";

export default function WorkspacePage() {
  const params = useParams<{ variantId: string }>();
  const variantId = Array.isArray(params?.variantId) ? params.variantId[0] : params?.variantId;
  const router = useRouter();

  const [boardNodes, setBoardNodes] = useState<BoardNode[]>([]);
  const [boardEdges, setBoardEdges] = useState<BoardEdge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [highlightedNodeIds, setHighlightedNodeIds] = useState<Set<string>>(new Set());
  const [highlightedEdgeIds, setHighlightedEdgeIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!variantId) return;

    let cancelled = false;

    async function load() {
      try {
        setIsLoading(true);
        setError(null);
        const workspace = await getVariantWorkspace(variantId);
        if (cancelled) return;
        setBoardNodes(workspace.nodes);
        setBoardEdges(workspace.edges);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "workspaceの取得に失敗しました");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [variantId]);

  if (!variantId) {
    return <div className="grid h-screen place-items-center text-sm text-gray-500">variantId が不正です</div>;
  }

  if (isLoading) {
    return <div className="grid h-screen place-items-center text-sm text-gray-500">workspace を読み込み中...</div>;
  }

  if (error) {
    return <div className="grid h-screen place-items-center text-sm text-red-500">{error}</div>;
  }

  return (
    <AIReviewProvider variantId={variantId}>
      <div className="flex h-screen w-screen">
        {/* キャンバス */}
        <div className="relative flex-1 overflow-hidden">
          {/* 戻るボタン */}
          <button
            onClick={() => router.back()}
            className="absolute left-4 top-4 z-10 flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white/90 px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-sm transition-colors hover:bg-white"
          >
            <ArrowLeft className="size-4" />
            戻る
          </button>

          <Whiteboard
            variantId={variantId}
            boardNodes={boardNodes}
            boardEdges={boardEdges}
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
