"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { Whiteboard } from "@/components/features/workspace/Whiteboard";
import { getVariantWorkspace } from "@/lib/api/variants";
import type { BoardEdge, BoardNode } from "@/types/type";

export default function WorkspacePage() {
  const params = useParams<{ variantId: string }>();
  const variantId = Array.isArray(params?.variantId) ? params.variantId[0] : params?.variantId;
  const [boardNodes, setBoardNodes] = useState<BoardNode[]>([]);
  const [boardEdges, setBoardEdges] = useState<BoardEdge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
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
    <div className="w-screen h-screen">
      <Whiteboard boardNodes={boardNodes} boardEdges={boardEdges} />
    </div>
  );
}
