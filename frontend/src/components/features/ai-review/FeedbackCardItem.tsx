"use client";

import { motion } from "motion/react";
import { AlertCircle, AlertTriangle, Info, MessageSquare, ScanSearch, ThumbsDown, ThumbsUp } from "lucide-react";
import type { FeedbackCard } from "@/types/ai-review";

interface FeedbackCardItemProps {
  card: FeedbackCard;
  isSelected: boolean;
  onClick: () => void;
  onChatOpen: () => void;
  onViewNodes?: () => void;
  onRate?: (reaction: "good" | "bad") => void;
  compact?: boolean;
}

const severityConfig = {
  high: {
    icon: AlertCircle,
    label: "HIGH SEVERITY",
    dot: "bg-red-500",
    badge: "bg-red-950 text-red-400 border-red-800",
    border: "border-red-800",
  },
  medium: {
    icon: AlertTriangle,
    label: "MEDIUM SEVERITY",
    dot: "bg-yellow-500",
    badge: "bg-yellow-950 text-yellow-400 border-yellow-800",
    border: "border-yellow-800",
  },
  low: {
    icon: Info,
    label: "OPTIMIZATION",
    dot: "bg-blue-500",
    badge: "bg-blue-950 text-blue-400 border-blue-800",
    border: "border-blue-800",
  },
};

export function FeedbackCardItem({ card, isSelected, onClick, onChatOpen, onViewNodes, onRate, compact }: FeedbackCardItemProps) {
  const { label, dot, badge, border } = severityConfig[card.severity];
  const hasRelatedTargets = (card.nodeIds?.length ?? 0) > 0 || (card.edgeIds?.length ?? 0) > 0;

  if (compact) {
    return (
      <motion.div
        onClick={onClick}
        initial={false}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.14, ease: "easeOut" }}
        className={`cursor-pointer rounded-lg border p-3 transition-all ${
          isSelected
            ? "border-indigo-300 bg-indigo-50/60 shadow-sm"
            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
        }`}
      >
        <div className="flex items-start gap-2">
          <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${dot}`} />
          <span className="text-sm font-medium leading-5 text-slate-800">{card.title}</span>
        </div>
        <p className="mt-1.5 text-xs leading-5 text-slate-500 line-clamp-2 pl-3.5">
          {card.description}
        </p>
        {isSelected && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="mt-3 space-y-2 border-t border-indigo-200 pt-3"
          >
            {/* 説明全文 */}
            <p className="whitespace-pre-wrap text-xs leading-5 text-slate-700">{card.description}</p>

            {/* ファイルパス */}
            {card.filePaths && card.filePaths.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {card.filePaths.map((fp) => (
                  <span key={fp} className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500 truncate max-w-full">
                    {fp}
                  </span>
                ))}
              </div>
            )}

            {/* 提案 */}
            {card.suggestion && (
              <div className="rounded-lg bg-white border border-slate-200 px-3 py-2">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">提案</p>
                <p className="whitespace-pre-wrap text-xs leading-5 text-slate-700">{card.suggestion}</p>
              </div>
            )}

            {/* アクション */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={(e) => { e.stopPropagation(); onChatOpen(); }}
                className="flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
              >
                <MessageSquare className="size-3" />
                議論する
              </button>
              {onRate && (
                <div className="ml-auto flex items-center gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); onRate("good"); }}
                    className={`rounded-md border p-1.5 text-xs ${card.userReaction === "good" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-500 hover:bg-slate-100"}`}
                  >
                    <ThumbsUp className="size-3" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onRate("bad"); }}
                    className={`rounded-md border p-1.5 text-xs ${card.userReaction === "bad" ? "border-rose-500 bg-rose-50 text-rose-700" : "border-slate-200 text-slate-500 hover:bg-slate-100"}`}
                  >
                    <ThumbsDown className="size-3" />
                  </button>
                </div>
              )}
            </div>

            {/* ノードハイライト */}
            {onViewNodes && hasRelatedTargets && (
              <button
                onClick={(e) => { e.stopPropagation(); onViewNodes(); }}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
              >
                <ScanSearch className="size-3.5" />
                関連箇所を強調表示
              </button>
            )}
          </motion.div>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      onClick={onClick}
      initial={false}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.14, ease: "easeOut" }}
      className={`cursor-pointer rounded-xl border-l-4 ${border} bg-[#1a2035] p-4 transition-all hover:bg-[#1e2540] ${
        isSelected ? "ring-1 ring-blue-500" : ""
      }`}
    >
      {/* severityバッジ */}
      <div className="mb-2">
        <span className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badge}`}>
          <span className={`size-1.5 rounded-full ${dot}`} />
          {label}
        </span>
      </div>

      {/* タイトル */}
      <h4 className="mb-1.5 font-semibold text-slate-100">{card.title}</h4>

      {/* 説明 */}
      <p className={`mb-3 text-sm text-slate-400 ${isSelected ? "whitespace-pre-wrap" : "line-clamp-2"}`}>{card.description}</p>

      {/* ファイルパス */}
      {card.filePaths && card.filePaths.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1">
          {card.filePaths.map((fp) => (
            <span key={fp} className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[11px] text-slate-400">
              {fp}
            </span>
          ))}
        </div>
      )}

      {/* 選択時: ノードを見る */}
      {isSelected && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.16, ease: "easeOut" }}
          className="mt-3 border-t border-slate-700 pt-3"
        >
          <div className="mb-3 rounded-lg bg-slate-900/60 p-3">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">提案</p>
            <p className="whitespace-pre-wrap text-xs leading-5 text-slate-300">{card.suggestion}</p>
          </div>
          {onRate && (
            <div className="mb-3 flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); onRate("good"); }}
                className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${card.userReaction === "good" ? "border-emerald-500 bg-emerald-500/10 text-emerald-300" : "border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700"}`}
              >
                <ThumbsUp className="size-3.5" />
                Good
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onRate("bad"); }}
                className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${card.userReaction === "bad" ? "border-rose-500 bg-rose-500/10 text-rose-300" : "border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700"}`}
              >
                <ThumbsDown className="size-3.5" />
                Bad
              </button>
            </div>
          )}
          {onViewNodes && hasRelatedTargets && (
            <button
              onClick={(e) => { e.stopPropagation(); onViewNodes(); }}
              className="flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 hover:border-slate-500 hover:bg-slate-700 transition-colors"
            >
              <ScanSearch className="size-3.5 text-blue-400" />
              関連箇所を強調表示
            </button>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
