"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { X, RotateCcw, FileText, FolderCode, CheckCircle, Loader2 } from "lucide-react";
import { useAIReview } from "./AIReviewContext";
import { ResolutionBuckets } from "./ResolutionBuckets";
import { FeedbackCardList } from "./FeedbackCardList";
import { ReviewChat } from "./ReviewChat";

type ScanStep = { label: string; sub: string; state: "done" | "active" | "pending" };

function ScanningScreen({ onCancel }: { onCancel: () => void }) {
  const steps: ScanStep[] = [
    { label: "設計書を解析中...", sub: "12ファイルの解析が完了しました", state: "done" },
    { label: "リポジトリの構造をスキャン中...", sub: "メインブランチと同期中...", state: "active" },
    { label: "フィードバックカードを生成中...", sub: "スキャン完了待ち", state: "pending" },
  ];

  return (
    <div className="flex h-full flex-col items-center justify-center bg-[#1a1008] px-6">
      {/* REVIEW LOOP ACTIVE バッジ */}
      <div className="mb-8 flex items-center gap-2 rounded-full border border-orange-700 bg-orange-950 px-4 py-1.5">
        <span className="size-2 rounded-full bg-orange-500 animate-pulse" />
        <span className="text-xs font-semibold uppercase tracking-widest text-orange-400">Review Loop Active</span>
      </div>

      <h2 className="mb-2 text-3xl font-bold text-white">AI スキャン中...</h2>
      <p className="mb-10 text-center text-sm text-slate-400">
        最新の変更を設計書とソースコードに照らしてAIが再評価しています
      </p>

      {/* 設計書 → スコア → ソースコード */}
      <div className="mb-10 flex items-center gap-6">
        <div className="flex flex-col items-center gap-2">
          <div className="flex size-16 items-center justify-center rounded-xl bg-[#2a1a08] text-orange-500">
            <FileText className="size-7" />
          </div>
          <span className="text-xs font-medium text-slate-300">設計書</span>
          <span className="text-[10px] uppercase tracking-wider text-slate-500">Markdown Docs</span>
        </div>

        <div className="flex flex-col items-center gap-1">
          <div className="h-px w-12 bg-orange-700" />
        </div>

        {/* サークルプログレス */}
        <div className="relative flex size-20 items-center justify-center">
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" stroke="#3a2010" strokeWidth="6" />
            <circle
              cx="40" cy="40" r="34" fill="none" stroke="#f97316" strokeWidth="6"
              strokeDasharray={`${2 * Math.PI * 34 * 0.65} ${2 * Math.PI * 34}`}
              strokeLinecap="round"
            />
          </svg>
          <div className="text-center">
            <div className="text-lg font-bold text-white">65%</div>
            <div className="text-[9px] uppercase tracking-wider text-orange-400">Synced</div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-1">
          <div className="h-px w-12 bg-orange-700" />
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="flex size-16 items-center justify-center rounded-xl bg-[#2a1a08] text-orange-500">
            <FolderCode className="size-7" />
          </div>
          <span className="text-xs font-medium text-slate-300">ソースコード</span>
          <span className="text-[10px] uppercase tracking-wider text-slate-500">Repository</span>
        </div>
      </div>

      {/* ステップリスト */}
      <div className="mb-8 w-full max-w-sm rounded-xl bg-[#221508] p-4 space-y-3">
        {steps.map((step) => (
          <div key={step.label} className="flex items-start gap-3">
            {step.state === "done" ? (
              <CheckCircle className="mt-0.5 size-4 shrink-0 text-green-500" />
            ) : step.state === "active" ? (
              <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-orange-400" />
            ) : (
              <div className="mt-0.5 size-4 shrink-0 rounded-full border border-slate-600" />
            )}
            <div>
              <p className={`text-sm font-medium ${step.state === "pending" ? "text-slate-500" : "text-slate-200"}`}>
                {step.label}
              </p>
              <p className={`text-xs ${step.state === "active" ? "text-orange-400" : "text-slate-500"}`}>
                {step.sub}
              </p>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onCancel}
        className="flex items-center gap-2 rounded-xl border border-slate-600 bg-[#2a1a08] px-6 py-3 text-sm font-medium text-slate-300 hover:bg-[#3a2010]"
      >
        <X className="size-4" />
        再評価をキャンセル
      </button>
    </div>
  );
}

interface AIReviewModalProps {
  onViewNodes?: (nodeIds: string[], edgeIds: string[]) => void;
}

export function AIReviewModal({ onViewNodes }: AIReviewModalProps) {
  const { isModalOpen, closeModal, selectedCardId, selectCard, loadReview } = useAIReview();

  const handleViewNodes = (nodeIds: string[], edgeIds: string[]) => {
    closeModal();
    onViewNodes?.(nodeIds, edgeIds);
  };
  const [isScanning, setIsScanning] = useState(false);
  if (typeof document === "undefined") return null;

  const handleReEvaluate = () => {
    setIsScanning(true);
    setTimeout(() => {
      loadReview();
      setIsScanning(false);
    }, 3000);
  };

  return createPortal(
    <AnimatePresence>
      {isModalOpen && (
        <motion.div
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          className="fixed inset-0 z-50 flex flex-col bg-[#111827]"
        >
          {isScanning ? (
            <ScanningScreen onCancel={() => setIsScanning(false)} />
          ) : (
            <>
              {/* ヘッダー */}
              <div className="flex items-center justify-between border-b border-slate-700 px-6 py-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-base font-bold text-white">AI Review Auditor</h2>
                  <span className="rounded-full bg-indigo-900 px-2 py-0.5 text-xs font-semibold text-indigo-300">beta</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleReEvaluate}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    <RotateCcw className="size-3.5" />
                    Re-evaluate
                  </button>
                  <button
                    onClick={closeModal}
                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
                  >
                    <X className="size-5" />
                  </button>
                </div>
              </div>

              {/* 上部: 3つの箱 */}
              <ResolutionBuckets />

              {/* 下部: カード一覧 + チャット */}
              <div className="flex flex-1 overflow-hidden">
                <div className="w-2/5 border-r border-slate-700 overflow-hidden">
                  <FeedbackCardList
                  onChatOpen={(cardId) => selectCard(cardId)}
                  onViewNodes={handleViewNodes}
                />
                </div>
                <div className="w-3/5 overflow-hidden">
                  {selectedCardId ? (
                    <ReviewChat />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-500">
                      <p className="text-sm">左のカードを選択して議論する</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
