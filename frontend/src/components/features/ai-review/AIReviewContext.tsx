"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { getAnalysisReport } from "@/lib/api/analysis";
import {
  appendReviewFeedbackChat,
  createReviewJob,
  getReviewJob,
  listReviewFeedbackChats,
  listReviewFeedbacks,
  resolveReviewFeedback,
  rateReviewFeedback,
  type ReviewFeedback,
  type ReviewFeedbackChat,
  type ReviewFeedbackTarget,
} from "@/lib/api/review";
import type {
  ChatMessage,
  FeedbackCard,
  FeedbackReaction,
  FeedbackSeverity,
  FeedbackStatus,
  FeedbackType,
  Resolution,
} from "@/types/ai-review";

type AIReviewContextType = {
  isModalOpen: boolean;
  cards: FeedbackCard[];
  selectedCardId: string | null;
  overallScore: number | null;
  summary: string;
  error: string;
  hasLoadedReview: boolean;
  isLoading: boolean;
  isReviewRunning: boolean;
  openModal: (cardId?: string) => void;
  closeModal: () => void;
  selectCard: (id: string | null) => void;
  resolveCard: (id: string, resolution: Resolution) => Promise<void>;
  unresolveCard: (id: string) => Promise<void>;
  rateCard: (id: string, reaction: FeedbackReaction) => Promise<void>;
  sendMessage: (cardId: string, content: string) => Promise<void>;
  loadReview: () => Promise<void>;
  refreshReview: () => Promise<void>;
};

const AIReviewContext = createContext<AIReviewContextType | null>(null);

const REVIEW_POLL_INTERVAL_MS = 1500;
const REVIEW_POLL_TIMEOUT_MS = 60_000;

function isResolution(value: string): value is Resolution {
  return value === "update_design_guide" || value === "fix_code" || value === "both";
}

function isFeedbackType(value: string): value is FeedbackType {
  return value === "design_guide" || value === "code";
}

function isFeedbackSeverity(value: string): value is FeedbackSeverity {
  return value === "high" || value === "medium" || value === "low";
}

function isFeedbackStatus(value: string): value is FeedbackStatus {
  return value === "open" || value === "resolved" || value === "dismissed";
}

function toChatMessages(chats: ReviewFeedbackChat[]): ChatMessage[] {
  return chats.map((chat) => ({
    role: chat.role === "ai" ? "ai" : "user",
    content: chat.content,
    timestamp: chat.createdAt,
  }));
}

function mapFeedbackCards(
  feedbacks: ReviewFeedback[],
  targets: ReviewFeedbackTarget[],
  previousCards: FeedbackCard[],
): FeedbackCard[] {
  const previousCardById = new Map(previousCards.map((card) => [card.id, card]));
  const targetsByFeedbackId = new Map<string, ReviewFeedbackTarget[]>();
  for (const target of targets) {
    const items = targetsByFeedbackId.get(target.feedbackId) ?? [];
    items.push(target);
    targetsByFeedbackId.set(target.feedbackId, items);
  }

  return feedbacks.map((feedback) => {
    const cardTargets = targetsByFeedbackId.get(feedback.id) ?? [];
    const previousCard = previousCardById.get(feedback.id);

    return {
      id: feedback.id,
      reviewJobId: feedback.reviewJobId,
      variantId: feedback.variantId,
      type: isFeedbackType(feedback.feedbackType) ? feedback.feedbackType : "code",
      severity: isFeedbackSeverity(feedback.severity) ? feedback.severity : "low",
      title: feedback.title,
      description: feedback.description,
      suggestion: feedback.suggestion,
      filePaths: cardTargets
        .filter((target) => target.targetType === "file")
        .map((target) => target.targetRef),
      nodeIds: cardTargets
        .filter((target) => target.targetType === "node")
        .map((target) => target.targetRef),
      edgeIds: cardTargets
        .filter((target) => target.targetType === "edge")
        .map((target) => target.targetRef),
      status: isFeedbackStatus(feedback.status) ? feedback.status : "open",
      resolution: isResolution(feedback.resolution) ? feedback.resolution : undefined,
      aiRecommendation: isResolution(feedback.aiRecommendation)
        ? feedback.aiRecommendation
        : undefined,
      userReaction: feedback.userReaction === "good" || feedback.userReaction === "bad" ? feedback.userReaction : undefined,
      resolved: feedback.status !== "open",
      chatHistory: previousCard?.chatHistory ?? [],
      chatsLoaded: previousCard?.chatsLoaded ?? false,
    };
  });
}

async function delay(ms: number) {
  await new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function AIReviewProvider({
  variantId,
  children,
}: {
  variantId: string;
  children: ReactNode;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cards, setCards] = useState<FeedbackCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [overallScore, setOverallScore] = useState<number | null>(null);
  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");
  const [hasLoadedReview, setHasLoadedReview] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isReviewRunning, setIsReviewRunning] = useState(false);

  const openModal = useCallback((cardId?: string) => {
    setIsModalOpen(true);
    if (cardId) {
      setSelectedCardId(cardId);
    }
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const selectCard = useCallback((id: string | null) => {
    setSelectedCardId(id);
  }, []);

  const refreshReview = useCallback(async () => {
    if (!variantId) return;
    setIsLoading(true);
    setError("");

    try {
      const [{ feedbacks, targets }, report] = await Promise.all([
        listReviewFeedbacks({ variantId }),
        getAnalysisReport(variantId),
      ]);

      setCards((previousCards) => mapFeedbackCards(feedbacks, targets, previousCards));
      setOverallScore(report?.overallScore ?? null);
      setSummary(report?.reportData.overview.summary ?? "");
      setHasLoadedReview(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "AIレビューの取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  }, [variantId]);

  const ensureCardChats = useCallback(async (cardId: string) => {
    const targetCard = cards.find((card) => card.id === cardId);
    if (!targetCard || targetCard.chatsLoaded) {
      return;
    }

    try {
      const chats = await listReviewFeedbackChats(cardId);
      setCards((previousCards) =>
        previousCards.map((card) =>
          card.id === cardId
            ? {
                ...card,
                chatHistory: toChatMessages(chats),
                chatsLoaded: true,
              }
            : card,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "チャット履歴の取得に失敗しました");
    }
  }, [cards]);

  useEffect(() => {
    void refreshReview();
  }, [refreshReview]);

  useEffect(() => {
    if (!selectedCardId) {
      return;
    }
    void ensureCardChats(selectedCardId);
  }, [ensureCardChats, selectedCardId]);

  const loadReview = useCallback(async () => {
    if (!variantId) return;
    setError("");
    setIsReviewRunning(true);

    try {
      const job = await createReviewJob(variantId);
      const deadline = Date.now() + REVIEW_POLL_TIMEOUT_MS;
      let currentStatus = job.status;

      while (currentStatus === "queued" || currentStatus === "running") {
        if (Date.now() > deadline) {
          throw new Error("レビューの完了待機がタイムアウトしました");
        }
        await delay(REVIEW_POLL_INTERVAL_MS);
        const latestJob = await getReviewJob(job.id);
        currentStatus = latestJob.status;
        if (currentStatus === "failed") {
          throw new Error(latestJob.errorMessage || "レビューの再評価に失敗しました");
        }
      }

      await refreshReview();
    } catch (err) {
      setError(err instanceof Error ? err.message : "AIレビューの再評価に失敗しました");
    } finally {
      setIsReviewRunning(false);
    }
  }, [refreshReview, variantId]);

  const resolveCard = useCallback(async (id: string, resolution: Resolution) => {
    try {
      const feedback = await resolveReviewFeedback(id, resolution, "resolved");
      setCards((previousCards) =>
        previousCards.map((card) =>
          card.id === id
            ? {
                ...card,
                status: "resolved",
                resolved: true,
                resolution: isResolution(feedback.resolution) ? feedback.resolution : resolution,
              }
            : card,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "フィードバックの解決に失敗しました");
    }
  }, []);

  const unresolveCard = useCallback(async (id: string) => {
    const currentCard = cards.find((card) => card.id === id);
    if (!currentCard) {
      return;
    }

    try {
      await resolveReviewFeedback(id, currentCard.resolution ?? "", "open");
      setCards((previousCards) =>
        previousCards.map((card) =>
          card.id === id
            ? {
                ...card,
                status: "open",
                resolved: false,
              }
            : card,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "フィードバックの更新に失敗しました");
    }
  }, [cards]);

  const rateCard = useCallback(async (id: string, reaction: FeedbackReaction) => {
    try {
      const feedback = await rateReviewFeedback(id, reaction);
      setCards((previousCards) =>
        previousCards.map((card) =>
          card.id === id
            ? {
                ...card,
                userReaction:
                  feedback.userReaction === "good" || feedback.userReaction === "bad"
                    ? feedback.userReaction
                    : reaction,
              }
            : card,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "フィードバック評価の保存に失敗しました");
    }
  }, []);

  const sendMessage = useCallback(async (cardId: string, content: string) => {
    try {
      const response = await appendReviewFeedbackChat(cardId, content);
      setCards((previousCards) =>
        previousCards.map((card) =>
          card.id === cardId
            ? {
                ...card,
                chatHistory: toChatMessages(response.chats),
                chatsLoaded: true,
                aiRecommendation:
                  response.feedback && isResolution(response.feedback.aiRecommendation)
                    ? response.feedback.aiRecommendation
                    : card.aiRecommendation,
                resolution:
                  response.feedback && isResolution(response.feedback.resolution)
                    ? response.feedback.resolution
                    : card.resolution,
                status:
                  response.feedback && isFeedbackStatus(response.feedback.status)
                    ? response.feedback.status
                    : card.status,
                resolved: response.feedback ? response.feedback.status !== "open" : card.resolved,
              }
            : card,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "チャットの送信に失敗しました");
    }
  }, []);

  const value = useMemo<AIReviewContextType>(
    () => ({
      isModalOpen,
      cards,
      selectedCardId,
      overallScore,
      summary,
      error,
      hasLoadedReview,
      isLoading,
      isReviewRunning,
      openModal,
      closeModal,
      selectCard,
      resolveCard,
      unresolveCard,
      rateCard,
      sendMessage,
      loadReview,
      refreshReview,
    }),
    [
      cards,
      closeModal,
      error,
      hasLoadedReview,
      isLoading,
      isModalOpen,
      isReviewRunning,
      loadReview,
      openModal,
      overallScore,
      refreshReview,
      resolveCard,
      rateCard,
      selectCard,
      selectedCardId,
      sendMessage,
      summary,
      unresolveCard,
    ],
  );

  return <AIReviewContext.Provider value={value}>{children}</AIReviewContext.Provider>;
}

export function useAIReview() {
  const ctx = useContext(AIReviewContext);
  if (!ctx) {
    throw new Error("useAIReview must be used within AIReviewProvider");
  }
  return ctx;
}
