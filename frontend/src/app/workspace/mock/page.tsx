"use client";

import { useState } from "react";

import { Whiteboard } from "@/components/features/workspace/Whiteboard";
import { AIReviewProvider } from "@/components/features/ai-review/AIReviewContext";
import { AIReviewSidePanel } from "@/components/features/ai-review/AIReviewSidePanel";
import { AIReviewModal } from "@/components/features/ai-review/AIReviewModal";
import type { BoardEdge, BoardNode } from "@/types/type";
import type { VariantWorkspaceData } from "@/lib/api/variants";

const MOCK_NODES: BoardNode[] = [
  {
    id: "1",
    kind: "function",
    title: "main",
    file_path: "cmd/main.go",
    signature: "func main()",
    receiver: "",
    x: 100,
    y: 200,
    code_text: `func main() {\n\tserver := NewServer()\n\tserver.Start()\n}`,
  },
  {
    id: "2",
    kind: "function",
    title: "NewServer",
    file_path: "internal/server/server.go",
    signature: "func NewServer() *Server",
    receiver: "",
    x: 400,
    y: 100,
    code_text: `func NewServer() *Server {\n\treturn &Server{\n\t\thandler: NewHandler(),\n\t}\n}`,
  },
  {
    id: "3",
    kind: "method",
    title: "Start",
    file_path: "internal/server/server.go",
    signature: "func (s *Server) Start()",
    receiver: "Server",
    x: 400,
    y: 350,
    code_text: `func (s *Server) Start() {\n\thttp.ListenAndServe(":8080", s.handler)\n}`,
  },
  {
    id: "4",
    kind: "interface",
    title: "Handler",
    file_path: "internal/handler/handler.go",
    signature: "type Handler interface",
    receiver: "",
    x: 700,
    y: 100,
    code_text: `type Handler interface {\n\tServeHTTP(w http.ResponseWriter, r *http.Request)\n}`,
  },
  {
    id: "5",
    kind: "function",
    title: "NewHandler",
    file_path: "internal/handler/handler.go",
    signature: "func NewHandler() Handler",
    receiver: "",
    x: 700,
    y: 300,
    code_text: `func NewHandler() Handler {\n\treturn &handlerImpl{}\n}`,
  },
  {
    id: "6",
    kind: "memo",
    title: "TODO",
    file_path: "",
    signature: "",
    receiver: "",
    x: 100,
    y: 450,
    code_text: "認証ミドルウェアを追加する",
  },
];

const MOCK_EDGES: BoardEdge[] = [
  { id: "e1", from_node_id: "1", to_node_id: "2", kind: "call", style: "solid" },
  { id: "e2", from_node_id: "1", to_node_id: "3", kind: "call", style: "solid" },
  { id: "e3", from_node_id: "2", to_node_id: "5", kind: "call", style: "solid" },
  { id: "e4", from_node_id: "5", to_node_id: "4", kind: "implement", style: "dashed" },
];

const MOCK_DESIGN_GUIDE: VariantWorkspaceData["designGuide"] = {
  id: "mock-dg-1",
  variantId: "mock-variant-1",
  title: "サンプルデザインガイド",
  description: "モック用のデザインガイドです",
  content: "## アーキテクチャ方針\n\n- レイヤードアーキテクチャを採用\n- インターフェースで依存を抽象化\n- ハンドラはビジネスロジックを持たない",
};

const MOCK_VARIANT_ID = "mock-variant-1";

export default function MockWorkspacePage() {
  const [designGuide, setDesignGuide] = useState<VariantWorkspaceData["designGuide"]>(MOCK_DESIGN_GUIDE);
  const [highlightedNodeIds, setHighlightedNodeIds] = useState<Set<string>>(new Set());
  const [highlightedEdgeIds, setHighlightedEdgeIds] = useState<Set<string>>(new Set());

  return (
    <AIReviewProvider variantId={MOCK_VARIANT_ID}>
      <div className="flex h-screen w-screen">
        <div className="relative flex-1 overflow-hidden">
          <div className="absolute left-4 top-4 z-10 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-700 shadow-sm">
            モックモード — バックエンド不要
          </div>

          <Whiteboard
            variantId={MOCK_VARIANT_ID}
            boardNodes={MOCK_NODES}
            boardEdges={MOCK_EDGES}
            highlightedNodeIds={highlightedNodeIds}
            highlightedEdgeIds={highlightedEdgeIds}
          />
        </div>

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

      <AIReviewModal
        onViewNodes={(nodeIds, edgeIds) => {
          setHighlightedNodeIds(new Set(nodeIds));
          setHighlightedEdgeIds(new Set(edgeIds));
        }}
      />
    </AIReviewProvider>
  );
}
