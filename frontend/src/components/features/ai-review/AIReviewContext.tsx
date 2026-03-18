"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { FeedbackCard, Resolution, ChatMessage } from "@/types/ai-review";
import { mockFeedbackCards, mockOverallScore, mockSummary } from "@/data/mock-ai-review";

type AIReviewContextType = {
  isModalOpen: boolean;
  cards: FeedbackCard[];
  selectedCardId: string | null;
  overallScore: number | null;
  summary: string;
  openModal: (cardId?: string) => void;
  closeModal: () => void;
  selectCard: (id: string | null) => void;
  resolveCard: (id: string, resolution: Resolution) => void;
  unresolveCard: (id: string) => void;
  sendMessage: (cardId: string, content: string) => void;
  loadReview: () => void;
};

const AIReviewContext = createContext<AIReviewContextType | null>(null);

export function AIReviewProvider({ children }: { children: ReactNode }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cards, setCards] = useState<FeedbackCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [overallScore, setOverallScore] = useState<number | null>(null);
  const [summary, setSummary] = useState("");

  const openModal = useCallback((cardId?: string) => {
    setIsModalOpen(true);
    if (cardId) setSelectedCardId(cardId);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const selectCard = useCallback((id: string | null) => {
    setSelectedCardId(id);
  }, []);

  const resolveCard = useCallback((id: string, resolution: Resolution) => {
    setCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, resolved: true, resolution } : c))
    );
  }, []);

  const unresolveCard = useCallback((id: string) => {
    setCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, resolved: false, resolution: undefined } : c))
    );
  }, []);

  const sendMessage = useCallback((cardId: string, content: string) => {
    const userMsg: ChatMessage = { role: "user", content, timestamp: new Date() };

    let currentHistory: ChatMessage[] = [];
    let currentType: FeedbackCard["type"] = "code";
    setCards((prev) => {
      const card = prev.find((c) => c.id === cardId);
      if (card) {
        currentHistory = card.chatHistory;
        currentType = card.type;
      }
      return prev.map((c) =>
        c.id === cardId ? { ...c, chatHistory: [...c.chatHistory, userMsg] } : c
      );
    });

    // モック: 500ms後にAI返答。2ターン目以降で推薦を提示する
    setTimeout(() => {
      const turnCount = currentHistory.filter((m) => m.role === "user").length;
      const isSecondTurn = turnCount >= 1;

      let aiContent: string;
      let recommendation: Resolution | undefined;

      if (isSecondTurn) {
        if (currentType === "design_guide") {
          recommendation = "update_design_guide";
          aiContent =
            "議論を踏まえると、このフィードバックは**設計書の更新**で対応するのが最適だと判断します。\n\n設計書に責務の境界を明文化することで、今後の開発指針として機能します。設計書を更新しますか？";
        } else {
          recommendation = "both";
          aiContent =
            "会話の内容を整理すると、コードの修正だけでは根本解決にならず、設計書にもその方針を反映すべきです。\n\n**両方対応**を推奨します。コードの修正と合わせて設計書も更新することで、同様の問題を未然に防げます。";
        }
      } else {
        aiContent =
          "ご指摘ありがとうございます。もう少し詳しく教えていただけますか？現在の実装でどのような問題が発生しているか、具体例があると判断しやすくなります。";
      }

      const aiMsg: ChatMessage = {
        role: "ai",
        content: aiContent,
        timestamp: new Date(),
      };

      setCards((prev) =>
        prev.map((c) =>
          c.id === cardId
            ? {
                ...c,
                chatHistory: [...c.chatHistory, aiMsg],
                ...(recommendation ? { aiRecommendation: recommendation } : {}),
              }
            : c
        )
      );
    }, 500);
  }, []);

  const loadReview = useCallback(() => {
    setCards(mockFeedbackCards.map((c) => ({ ...c, resolved: false, resolution: undefined, chatHistory: [] })));
    setOverallScore(mockOverallScore);
    setSummary(mockSummary);
  }, []);

  return (
    <AIReviewContext.Provider
      value={{
        isModalOpen,
        cards,
        selectedCardId,
        overallScore,
        summary,
        openModal,
        closeModal,
        selectCard,
        resolveCard,
        unresolveCard,
        sendMessage,
        loadReview,
      }}
    >
      {children}
    </AIReviewContext.Provider>
  );
}

export function useAIReview() {
  const ctx = useContext(AIReviewContext);
  if (!ctx) throw new Error("useAIReview must be used within AIReviewProvider");
  return ctx;
}
