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
  createReviewApplyJob,
  createReviewJob,
  generateReviewResolutionDraft,
  getReviewApplyJob,
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
  isApplyRunning: boolean;
  resolvedCount: number;
  openModal: (cardId?: string) => void;
  closeModal: () => void;
  selectCard: (id: string | null) => void;
  resolveCard: (id: string, resolution: Resolution, resolutionNote?: string) => Promise<void>;
  generateResolutionDraft: (id: string, resolution: Resolution) => Promise<string>;
  unresolveCard: (id: string) => Promise<void>;
  rateCard: (id: string, reaction: FeedbackReaction) => Promise<void>;
  sendMessage: (cardId: string, content: string) => Promise<void>;
  loadReview: () => Promise<void>;
  applyResolvedFeedbacks: () => Promise<void>;
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
        .map((target) => target.filePath)
        .filter((path): path is string => Boolean(path)),
      nodeIds: cardTargets
        .map((target) => target.nodeId)
        .filter((id): id is string => Boolean(id)),
      edgeIds: cardTargets
        .map((target) => target.edgeId)
        .filter((id): id is string => Boolean(id)),
      status: isFeedbackStatus(feedback.status) ? feedback.status : "open",
      resolution: isResolution(feedback.resolution) ? feedback.resolution : undefined,
      resolutionNote: feedback.resolutionNote || undefined,
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
  onApplied,
  children,
}: {
  variantId: string;
  onApplied?: () => Promise<void> | void;
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
  const [isApplyRunning, setIsApplyRunning] = useState(false);
  const resolvedCount = useMemo(() => cards.filter((card) => card.resolved && card.resolutionNote).length, [cards]);

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

  const applyResolvedFeedbacks = useCallback(async () => {
    const latestReviewJobId = cards[0]?.reviewJobId;
    if (!latestReviewJobId) {
      setError("適用対象のレビュー結果がありません");
      return;
    }

    if (resolvedCount === 0) {
      setError("適用できる解決済みカードがありません");
      return;
    }

    setError("");
    setIsApplyRunning(true);
    try {
      const job = await createReviewApplyJob(latestReviewJobId);
      const deadline = Date.now() + REVIEW_POLL_TIMEOUT_MS * 2;
      let currentStatus = job.status;

      while (currentStatus === "queued" || currentStatus === "running") {
        if (Date.now() > deadline) {
          throw new Error("決定内容の適用待機がタイムアウトしました");
        }
        await delay(REVIEW_POLL_INTERVAL_MS);
        const latestJob = await getReviewApplyJob(job.id);
        currentStatus = latestJob.status;
        if (currentStatus === "failed") {
          throw new Error(latestJob.errorMessage || "決定内容の適用に失敗しました");
        }
      }

      await onApplied?.();
      setCards([]);
      setSelectedCardId(null);
      setOverallScore(null);
      setSummary("");
      setHasLoadedReview(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "決定内容の適用に失敗しました");
    } finally {
      setIsApplyRunning(false);
    }
  }, [cards, onApplied, resolvedCount]);

  const resolveCard = useCallback(async (id: string, resolution: Resolution, resolutionNote?: string) => {
    try {
      const feedback = await resolveReviewFeedback(id, resolution, resolutionNote ?? "", "resolved");
      setCards((previousCards) =>
        previousCards.map((card) =>
          card.id === id
            ? {
                ...card,
                status: "resolved",
                resolved: true,
                resolution: isResolution(feedback.resolution) ? feedback.resolution : resolution,
                resolutionNote: feedback.resolutionNote || resolutionNote,
              }
            : card,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "フィードバックの解決に失敗しました");
    }
  }, []);

  const generateResolutionDraftForCard = useCallback(async (id: string, resolution: Resolution) => {
    return generateReviewResolutionDraft(id, resolution);
  }, []);

  const unresolveCard = useCallback(async (id: string) => {
    const currentCard = cards.find((card) => card.id === id);
    if (!currentCard) {
      return;
    }

    try {
      await resolveReviewFeedback(id, currentCard.resolution ?? "", currentCard.resolutionNote ?? "", "open");
      setCards((previousCards) =>
        previousCards.map((card) =>
          card.id === id
            ? {
                ...card,
                status: "open",
                resolved: false,
                resolutionNote: currentCard.resolutionNote,
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
      isApplyRunning,
      resolvedCount,
      openModal,
      closeModal,
      selectCard,
      resolveCard,
      generateResolutionDraft: generateResolutionDraftForCard,
      unresolveCard,
      rateCard,
      sendMessage,
      loadReview,
      applyResolvedFeedbacks,
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
      isApplyRunning,
      resolvedCount,
      loadReview,
      applyResolvedFeedbacks,
      openModal,
      overallScore,
      refreshReview,
      resolveCard,
      generateResolutionDraftForCard,
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
