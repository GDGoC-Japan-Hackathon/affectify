"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Whiteboard } from "@/components/features/workspace/Whiteboard";
import { getVariantWorkspace, type VariantWorkspaceData } from "@/lib/api/variants";
import { AIReviewProvider } from "@/components/features/ai-review/AIReviewContext";
import { AIReviewSidePanel } from "@/components/features/ai-review/AIReviewSidePanel";
import { AIReviewModal } from "@/components/features/ai-review/AIReviewModal";
import { useAuth } from "@/lib/auth";
import type { BoardEdge, BoardNode } from "@/types/type";

export default function WorkspacePage() {
  return <Suspense><WorkspaceInner /></Suspense>;
}

function WorkspaceInner() {
  const params = useParams<{ variantId: string }>();
  const variantId = Array.isArray(params?.variantId) ? params.variantId[0] : params?.variantId;
  const router = useRouter();
  const { loading: authLoading, user } = useAuth();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [designGuide, setDesignGuide] = useState<VariantWorkspaceData["designGuide"]>();

  const [boardNodes, setBoardNodes] = useState<BoardNode[]>([]);
  const [boardEdges, setBoardEdges] = useState<BoardEdge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [highlightedNodeIds, setHighlightedNodeIds] = useState<Set<string>>(new Set());
  const [highlightedEdgeIds, setHighlightedEdgeIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, router, user]);

  useEffect(() => {
    if (!variantId || authLoading || !user) return;

    let cancelled = false;

    async function load() {
      try {
        setIsLoading(true);
        setError(null);
        const workspace = await getVariantWorkspace(variantId);
        if (cancelled) return;
        setProjectId(workspace.projectId || null);
        setDesignGuide(workspace.designGuide);
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
  }, [authLoading, user, variantId]);

  if (!variantId) {
    return <div className="grid h-screen place-items-center text-sm text-gray-500">variantId が不正です</div>;
  }

  if (authLoading || !user) {
    return <div className="grid h-screen place-items-center text-sm text-gray-500">認証状態を確認中...</div>;
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
          {projectId && (
            <button
              onClick={() => router.push(`/project/${projectId}`)}
              className="absolute left-4 top-4 z-10 flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white/90 px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-sm transition-colors hover:bg-white"
            >
              <ArrowLeft className="size-4" />
              プロジェクト詳細
            </button>
          )}

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
          designGuide={designGuide}
          onDesignGuideSaved={(nextGuide) => setDesignGuide(nextGuide)}
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
