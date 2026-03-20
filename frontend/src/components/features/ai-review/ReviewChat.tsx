"use client";

import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { Send, MessageSquare, BookOpen, Code, Layers, ArrowRight } from "lucide-react";
import { useAIReview } from "./AIReviewContext";
import type { Resolution } from "@/types/ai-review";

const actionConfig: Record<Resolution, { label: string; icon: typeof BookOpen; primary: string; desc: string }> = {
  update_design_guide: {
    label: "設計書を更新",
    icon: BookOpen,
    primary: "border-indigo-500/50 bg-indigo-500/10 hover:bg-indigo-500/20",
    desc: "AIの提案を設計書に反映します",
  },
  fix_code: {
    label: "コードを修正",
    icon: Code,
    primary: "border-blue-500/50 bg-blue-500/10 hover:bg-blue-500/20",
    desc: "AIのアーキテクチャ修正を適用します",
  },
  both: {
    label: "両方対応",
    icon: Layers,
    primary: "border-purple-500/50 bg-purple-500/10 hover:bg-purple-500/20",
    desc: "コード修正と設計書更新を同時に行います",
  },
};

export function ReviewChat() {
  const { cards, selectedCardId, sendMessage, resolveCard } = useAIReview();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const selectedCard = cards.find((c) => c.id === selectedCardId);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedCard?.chatHistory.length]);

  const handleSend = () => {
    if (!input.trim() || !selectedCardId) return;
    sendMessage(selectedCardId, input.trim());
    setInput("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleSend();
  };

  if (!selectedCard) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-[#111827] text-slate-500">
        <MessageSquare className="size-10" />
        <p className="text-sm">カードを選択してAIと議論する</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-[#111827]">
      {/* ヘッダー */}
      <div className="flex items-center justify-between border-b border-slate-700 px-5 py-3">
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-full bg-blue-600">
            <MessageSquare className="size-3 text-white" />
          </div>
          <span className="text-sm font-semibold text-slate-200">AI Assistant</span>
        </div>
        <button className="text-xs text-blue-400 hover:text-blue-300">View Documentation</button>
      </div>

      {/* チャット履歴 */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* 初期メッセージ */}
        {selectedCard.chatHistory.length === 0 && (
          <div className="rounded-xl bg-[#1a2035] p-4">
            <p className="mb-1 text-xs font-semibold text-blue-400">AI</p>
            <p className="text-sm text-slate-300">{selectedCard.description}</p>
            <div className="mt-3 rounded-lg bg-slate-800/50 p-3">
              <p className="text-xs text-slate-400">提案:</p>
              <p className="mt-1 text-sm text-slate-200">{selectedCard.suggestion}</p>
            </div>
          </div>
        )}

        {selectedCard.chatHistory.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "ai" && (
              <div className="max-w-[85%] rounded-xl bg-[#1a2035] p-4">
                <p className="mb-1 text-xs font-semibold text-blue-400">AI</p>
                <p className="whitespace-pre-wrap text-sm text-slate-300">{msg.content}</p>
              </div>
            )}
            {msg.role === "user" && (
              <div className="max-w-[85%] rounded-xl bg-blue-700 px-4 py-3">
                <p className="text-sm text-white">{msg.content}</p>
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* 推奨アクション: AIが推薦を提示した時のみ表示 */}
      {!selectedCard.resolved && selectedCard.aiRecommendation && (() => {
        const rec = selectedCard.aiRecommendation;
        const { label, icon: Icon, primary, desc } = actionConfig[rec];
        const alternatives = (Object.keys(actionConfig) as Resolution[]).filter((r) => r !== rec);
        return (
          <div className="border-t border-slate-700 px-5 py-4">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Recommended Action</p>
            {/* メインアクション */}
            <button
              onClick={() => resolveCard(selectedCard.id, rec)}
              className={`w-full flex items-center justify-between rounded-xl border p-4 transition-all ${primary} group`}
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-600 p-2.5 text-white">
                  <Icon className="size-5" />
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Recommended</p>
                  <p className="text-base font-bold text-white">{label}</p>
                  <p className="text-xs text-slate-400">{desc}</p>
                </div>
              </div>
              <ArrowRight className="size-4 text-blue-400 transition-transform group-hover:translate-x-1" />
            </button>
            {/* サブアクション */}
            <div className="mt-3 flex items-center justify-between px-1">
              {alternatives.map((alt) => (
                <button
                  key={alt}
                  onClick={() => resolveCard(selectedCard.id, alt)}
                  className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 underline underline-offset-2 hover:text-slate-300 transition-colors"
                >
                  {actionConfig[alt].label}
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      {/* 入力エリア */}
      <div className="border-t border-slate-700 p-3">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="メッセージを入力（⌘+Enter で送信）"
            rows={2}
            className="flex-1 resize-none rounded-xl border border-slate-700 bg-[#1a2035] px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="self-end rounded-xl bg-blue-600 p-2.5 text-white hover:bg-blue-700 disabled:opacity-40"
          >
            <Send className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
