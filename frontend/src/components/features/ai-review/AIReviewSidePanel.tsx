"use client";

import { useState } from "react";
import { Bot, BookOpen, ChevronLeft, ChevronRight, Maximize2, Pencil, Save, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { updateVariantDesignGuide, type VariantWorkspaceData } from "@/lib/api/variants";
import { AnimatePresence } from "motion/react";
import { useAIReview } from "./AIReviewContext";
import { FeedbackCardItem } from "./FeedbackCardItem";

interface AIReviewSidePanelProps {
  designGuide?: VariantWorkspaceData["designGuide"];
  onDesignGuideSaved: (guide: NonNullable<VariantWorkspaceData["designGuide"]>) => void;
  onHighlightNodes: (nodeIds: string[], edgeIds: string[]) => void;
  onClearHighlight: () => void;
}

type Tab = "review" | "guide";

export function AIReviewSidePanel({ designGuide, onDesignGuideSaved, onHighlightNodes, onClearHighlight }: AIReviewSidePanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("review");
  const [collapsed, setCollapsed] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [savedContent, setSavedContent] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const {
    cards,
    selectedCardId,
    selectCard,
    rateCard,
    overallScore,
    summary,
    openModal,
    loadReview,
    applyResolvedFeedbacks,
    isLoading,
    isReviewRunning,
    isApplyRunning,
    hasLoadedReview,
    error,
  } = useAIReview();

  const handleEditStart = () => {
    setEditContent(savedContent ?? designGuide?.content ?? "");
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!designGuide?.id) return;
    try {
      setIsSaving(true);
      const updatedGuide = await updateVariantDesignGuide({
        id: designGuide.id,
        title: designGuide.title,
        description: designGuide.description,
        content: editContent,
      });
      onDesignGuideSaved(updatedGuide);
      toast.success("設計書を保存しました");
      setSavedContent(editContent);
      setIsEditing(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  const unresolvedCards = cards.filter((c) => !c.resolved);
  const resolvedCount = cards.filter((c) => c.resolved).length;

  const handleCardClick = (cardId: string) => {
    const isDeselect = selectedCardId === cardId;
    selectCard(isDeselect ? null : cardId);
    if (isDeselect) {
      onClearHighlight();
    } else {
      const card = cards.find((c) => c.id === cardId);
      if (card) onHighlightNodes(card.nodeIds ?? [], card.edgeIds ?? []);
    }
  };

  if (collapsed) {
    return (
      <div className="relative flex w-8 shrink-0 flex-col items-center border-l border-slate-200 bg-white">
        <button
          onClick={() => setCollapsed(false)}
          className="absolute top-1/2 -translate-y-1/2 flex size-8 items-center justify-center rounded-full border border-slate-200 bg-white shadow-md text-slate-500 hover:text-slate-800 hover:shadow-lg transition-all"
          title="パネルを開く"
        >
          <ChevronLeft className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex w-72 shrink-0 flex-col border-l border-slate-200 bg-slate-50/80 backdrop-blur-sm">
      {/* 閉じるボタン（左辺中央） */}
      <button
        onClick={() => setCollapsed(true)}
        className="absolute -left-4 top-1/2 -translate-y-1/2 flex size-8 items-center justify-center rounded-full border border-slate-200 bg-white shadow-md text-slate-400 hover:text-slate-700 hover:shadow-lg transition-all z-10"
        title="パネルを閉じる"
      >
        <ChevronRight className="size-4" />
      </button>

      {/* タブ */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("review")}
          className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors ${
            activeTab === "review"
              ? "border-b-2 border-indigo-600 text-indigo-600"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Bot className="size-3.5" />
          AIレビュー
        </button>
        <button
          onClick={() => setActiveTab("guide")}
          className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors ${
            activeTab === "guide"
              ? "border-b-2 border-indigo-600 text-indigo-600"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <BookOpen className="size-3.5" />
          設計書
        </button>
      </div>

      {/* AIレビュータブ */}
      {activeTab === "review" && (
        <>
          {/* ヘッダー */}
          <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
            <span className="text-sm font-semibold text-slate-900">フィードバック</span>
            <button
              onClick={() => openModal()}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              title="全画面で開く"
            >
              <Maximize2 className="size-4" />
            </button>
          </div>

          {isLoading ? (
            <div className="flex flex-1 items-center justify-center px-4 text-sm text-slate-500">
              レビュー結果を読み込み中...
            </div>
          ) : cards.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
              <Sparkles className="size-8 text-indigo-400" />
              <p className="text-sm text-slate-600">
                {hasLoadedReview
                  ? "レビューは完了しましたが、表示できるフィードバックはまだありません"
                  : "設計書とコードをAIがレビューします"}
              </p>
              <button
                onClick={() => void loadReview()}
                disabled={isReviewRunning}
                className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isReviewRunning ? "レビュー中..." : hasLoadedReview ? "再レビュー" : "レビューを開始"}
              </button>
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
          ) : (
            <>
              {overallScore !== null && (
                <div className="border-b border-slate-200 bg-white px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`text-xl font-bold ${overallScore >= 80 ? "text-green-600" : overallScore >= 60 ? "text-yellow-600" : "text-red-600"}`}>
                      {overallScore}点
                    </div>
                    <div className="text-xs text-slate-500">
                      {resolvedCount}/{cards.length} 解決済み
                    </div>
                  </div>
                  {summary && (
                    <p className="mt-2 text-xs leading-5 text-slate-600 line-clamp-3">{summary}</p>
                  )}
                </div>
              )}
              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
                <AnimatePresence>
                  {unresolvedCards.map((card) => (
                    <FeedbackCardItem
                      key={card.id}
                      card={card}
                      isSelected={selectedCardId === card.id}
                      onClick={() => handleCardClick(card.id)}
                      onChatOpen={() => openModal(card.id)}
                      onRate={(reaction) => void rateCard(card.id, reaction)}
                      compact
                    />
                  ))}
                </AnimatePresence>
                {unresolvedCards.length === 0 && (
                  <p className="py-4 text-center text-xs text-slate-500">すべて解決済み</p>
                )}
              </div>
              <div className="border-t border-slate-200 bg-white p-3">
                <button
                  onClick={() => void applyResolvedFeedbacks()}
                  disabled={isApplyRunning || resolvedCount === 0}
                  className="mb-2 w-full rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isApplyRunning ? "反映中..." : "決定内容を反映"}
                </button>
                <button
                  onClick={() => openModal()}
                  className="w-full rounded-lg border border-slate-300 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  全画面で開く
                </button>
              </div>
            </>
          )}
        </>
      )}

      {/* 設計書タブ */}
      {activeTab === "guide" && (
        <div className="flex flex-1 flex-col overflow-hidden">
          {designGuide ? (
            <>
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <p className="text-sm font-semibold text-slate-900 truncate flex-1 mr-2">{designGuide.title}</p>
                {!isEditing ? (
                  <button
                    onClick={handleEditStart}
                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    title="編集"
                  >
                    <Pencil className="size-4" />
                  </button>
                ) : (
                  <div className="flex gap-1">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      title="キャンセル"
                    >
                      <X className="size-4" />
                    </button>
                    <button
                      onClick={() => void handleSave()}
                      disabled={isSaving}
                      className="rounded-lg p-1 text-indigo-500 hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-50"
                      title="保存"
                    >
                      <Save className="size-4" />
                    </button>
                  </div>
                )}
              </div>
              {isEditing ? (
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="flex-1 resize-none px-4 py-4 text-xs text-slate-700 leading-relaxed outline-none focus:ring-0"
                  disabled={isSaving}
                />
              ) : (
                <div className="flex-1 overflow-y-auto px-4 py-4 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {savedContent ?? designGuide.content}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
              <BookOpen className="size-8 text-slate-300" />
              <p className="text-sm text-slate-500">この設計案に設計書が設定されていません</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
