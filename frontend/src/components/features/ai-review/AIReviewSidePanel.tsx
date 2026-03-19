"use client";

import { Bot, Maximize2, Sparkles } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useAIReview } from "./AIReviewContext";
import { FeedbackCardItem } from "./FeedbackCardItem";

interface AIReviewSidePanelProps {
  onHighlightNodes: (nodeIds: string[], edgeIds: string[]) => void;
  onClearHighlight: () => void;
}

export function AIReviewSidePanel({ onHighlightNodes, onClearHighlight }: AIReviewSidePanelProps) {
  const {
    cards,
    selectedCardId,
    selectCard,
    overallScore,
    openModal,
    loadReview,
    isLoading,
    isReviewRunning,
    hasLoadedReview,
    error,
  } = useAIReview();

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

  return (
    <div className="flex w-64 shrink-0 flex-col border-l border-slate-200 bg-white">
      {/* ヘッダー */}
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <Bot className="size-4 text-indigo-600" />
          <span className="text-sm font-semibold text-slate-900">AIレビュー</span>
        </div>
        {cards.length > 0 && (
          <button
            onClick={() => openModal()}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            title="全画面で開く"
          >
            <Maximize2 className="size-4" />
          </button>
        )}
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
            {isReviewRunning ? "レビュー中..." : hasLoadedReview ? "再評価する" : "レビューを開始"}
          </button>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      ) : (
        <>
          {/* スコア */}
          {overallScore !== null && (
            <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
              <div className={`text-xl font-bold ${overallScore >= 80 ? "text-green-600" : overallScore >= 60 ? "text-yellow-600" : "text-red-600"}`}>
                {overallScore}点
              </div>
              <div className="text-xs text-slate-500">
                {resolvedCount}/{cards.length} 解決済み
              </div>
            </div>
          )}

          {/* カード一覧（compact） */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
            <AnimatePresence>
              {unresolvedCards.map((card) => (
                <FeedbackCardItem
                  key={card.id}
                  card={card}
                  isSelected={selectedCardId === card.id}
                  onClick={() => handleCardClick(card.id)}
                  onChatOpen={() => openModal(card.id)}
                  compact
                />
              ))}
            </AnimatePresence>
            {unresolvedCards.length === 0 && (
              <p className="py-4 text-center text-xs text-slate-500">すべて解決済み</p>
            )}
          </div>

          {/* 全画面ボタン */}
          <div className="border-t border-slate-200 p-3">
            <button
              onClick={() => openModal()}
              className="w-full rounded-lg border border-slate-300 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              全画面で開く
            </button>
          </div>
        </>
      )}
    </div>
  );
}
