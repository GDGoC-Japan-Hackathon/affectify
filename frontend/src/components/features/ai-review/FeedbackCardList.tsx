"use client";

import { AnimatePresence } from "motion/react";
import { useAIReview } from "./AIReviewContext";
import { FeedbackCardItem } from "./FeedbackCardItem";

const severityOrder = { high: 0, medium: 1, low: 2 };

interface FeedbackCardListProps {
  onChatOpen: (cardId: string) => void;
  onViewNodes?: (nodeIds: string[], edgeIds: string[]) => void;
}

export function FeedbackCardList({ onChatOpen, onViewNodes }: FeedbackCardListProps) {
  const { cards, selectedCardId, selectCard, overallScore, summary, rateCard } = useAIReview();

  const unresolvedCards = cards
    .filter((c) => !c.resolved)
    .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return (
    <div className="flex h-full flex-col bg-[#111827]">
      {/* スコア・サマリー */}
      {overallScore !== null && (
        <div className="border-b border-slate-700 px-4 py-3">
          <div className="mb-1 flex items-center gap-3">
            <div className={`text-2xl font-bold ${overallScore >= 80 ? "text-green-400" : overallScore >= 60 ? "text-yellow-400" : "text-red-400"}`}>
              {overallScore}
            </div>
            <div className="text-xs text-slate-500">/ 100</div>
            <div className="text-xs text-slate-400">総合スコア</div>
          </div>
          <p className="text-xs text-slate-500 line-clamp-2">{summary}</p>
        </div>
      )}

      {/* ラベル */}
      <div className="border-b border-slate-700 px-4 py-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Feedback Issues ({unresolvedCards.length})
        </span>
      </div>

      {/* カード一覧 */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        <AnimatePresence>
          {unresolvedCards.map((card) => (
            <FeedbackCardItem
              key={card.id}
              card={card}
              isSelected={selectedCardId === card.id}
              onClick={() => selectCard(selectedCardId === card.id ? null : card.id)}
              onChatOpen={() => onChatOpen(card.id)}
              onRate={(reaction) => void rateCard(card.id, reaction)}
              onViewNodes={onViewNodes ? () => onViewNodes(card.nodeIds ?? [], card.edgeIds ?? []) : undefined}
            />
          ))}
        </AnimatePresence>

        {unresolvedCards.length === 0 && cards.length > 0 && (
          <div className="py-8 text-center text-sm text-slate-500">
            すべてのカードが確定されました
          </div>
        )}
      </div>
    </div>
  );
}
