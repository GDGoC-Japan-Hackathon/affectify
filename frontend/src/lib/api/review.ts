import { create } from "@bufbuild/protobuf";

import { createConnectClient } from "@/lib/connect";
import {
  AppendReviewFeedbackChatRequestSchema,
  CreateReviewJobRequestSchema,
  GetReviewJobRequestSchema,
  ListReviewFeedbackChatsRequestSchema,
  ListReviewFeedbacksRequestSchema,
  ResolveReviewFeedbackRequestSchema,
  ReviewService,
  type ReviewFeedback as ProtoReviewFeedback,
  type ReviewFeedbackChat as ProtoReviewFeedbackChat,
  type ReviewFeedbackTarget as ProtoReviewFeedbackTarget,
  type ReviewJob as ProtoReviewJob,
} from "@/gen/api/v1/review_pb";
import type { Timestamp } from "@bufbuild/protobuf/wkt";

export interface ReviewJob {
  id: string;
  variantId: string;
  status: string;
  errorMessage: string;
  startedAt: Date | null;
  finishedAt: Date | null;
  createdAt: Date;
}

export interface ReviewFeedback {
  id: string;
  reviewJobId: string;
  variantId: string;
  feedbackType: string;
  severity: string;
  title: string;
  description: string;
  suggestion: string;
  aiRecommendation: string;
  resolution: string;
  status: string;
  displayOrder: number;
  createdAt: Date;
}

export interface ReviewFeedbackTarget {
  id: string;
  feedbackId: string;
  targetType: string;
  targetRef: string;
}

export interface ReviewFeedbackChat {
  id: string;
  feedbackId: string;
  role: string;
  content: string;
  createdBy?: string;
  createdAt: Date;
}

export interface ListReviewFeedbacksOptions {
  variantId: string;
  reviewJobId?: string;
  onlyOpen?: boolean;
}

const reviewClient = createConnectClient(ReviewService);

export async function createReviewJob(variantId: string): Promise<ReviewJob> {
  const response = await reviewClient.createReviewJob(
    create(CreateReviewJobRequestSchema, {
      variantId: BigInt(variantId),
    }),
  );

  if (!response.job) {
    throw new Error("レビュージョブの作成に失敗しました");
  }

  return mapReviewJob(response.job);
}

export async function getReviewJob(id: string): Promise<ReviewJob> {
  const response = await reviewClient.getReviewJob(
    create(GetReviewJobRequestSchema, {
      id: BigInt(id),
    }),
  );

  if (!response.job) {
    throw new Error("レビュージョブの取得に失敗しました");
  }

  return mapReviewJob(response.job);
}

export async function listReviewFeedbacks(options: ListReviewFeedbacksOptions): Promise<{
  feedbacks: ReviewFeedback[];
  targets: ReviewFeedbackTarget[];
}> {
  const response = await reviewClient.listReviewFeedbacks(
    create(ListReviewFeedbacksRequestSchema, {
      variantId: BigInt(options.variantId),
      reviewJobId: options.reviewJobId ? BigInt(options.reviewJobId) : undefined,
      onlyOpen: options.onlyOpen ?? false,
    }),
  );

  return {
    feedbacks: response.feedbacks.map(mapReviewFeedback),
    targets: response.targets.map(mapReviewFeedbackTarget),
  };
}

export async function listReviewFeedbackChats(feedbackId: string): Promise<ReviewFeedbackChat[]> {
  const response = await reviewClient.listReviewFeedbackChats(
    create(ListReviewFeedbackChatsRequestSchema, {
      feedbackId: BigInt(feedbackId),
    }),
  );

  return response.chats.map(mapReviewFeedbackChat);
}

export async function appendReviewFeedbackChat(
  feedbackId: string,
  content: string,
): Promise<{ chats: ReviewFeedbackChat[]; feedback: ReviewFeedback | null }> {
  const response = await reviewClient.appendReviewFeedbackChat(
    create(AppendReviewFeedbackChatRequestSchema, {
      feedbackId: BigInt(feedbackId),
      content,
    }),
  );

  return {
    chats: response.chats.map(mapReviewFeedbackChat),
    feedback: response.feedback ? mapReviewFeedback(response.feedback) : null,
  };
}

export async function resolveReviewFeedback(
  feedbackId: string,
  resolution: string,
  status = "resolved",
): Promise<ReviewFeedback> {
  const response = await reviewClient.resolveReviewFeedback(
    create(ResolveReviewFeedbackRequestSchema, {
      feedbackId: BigInt(feedbackId),
      resolution,
      status,
    }),
  );

  if (!response.feedback) {
    throw new Error("フィードバックの解決に失敗しました");
  }

  return mapReviewFeedback(response.feedback);
}

function mapReviewJob(job: ProtoReviewJob): ReviewJob {
  return {
    id: job.id.toString(),
    variantId: job.variantId.toString(),
    status: job.status,
    errorMessage: job.errorMessage,
    startedAt: job.startedAt ? toDate(job.startedAt) : null,
    finishedAt: job.finishedAt ? toDate(job.finishedAt) : null,
    createdAt: toDate(job.createdAt),
  };
}

function mapReviewFeedback(feedback: ProtoReviewFeedback): ReviewFeedback {
  return {
    id: feedback.id.toString(),
    reviewJobId: feedback.reviewJobId.toString(),
    variantId: feedback.variantId.toString(),
    feedbackType: feedback.feedbackType,
    severity: feedback.severity,
    title: feedback.title,
    description: feedback.description,
    suggestion: feedback.suggestion,
    aiRecommendation: feedback.aiRecommendation,
    resolution: feedback.resolution,
    status: feedback.status,
    displayOrder: feedback.displayOrder,
    createdAt: toDate(feedback.createdAt),
  };
}

function mapReviewFeedbackTarget(target: ProtoReviewFeedbackTarget): ReviewFeedbackTarget {
  return {
    id: target.id.toString(),
    feedbackId: target.feedbackId.toString(),
    targetType: target.targetType,
    targetRef: target.targetRef,
  };
}

function mapReviewFeedbackChat(chat: ProtoReviewFeedbackChat): ReviewFeedbackChat {
  return {
    id: chat.id.toString(),
    feedbackId: chat.feedbackId.toString(),
    role: chat.role,
    content: chat.content,
    createdBy: chat.createdBy?.toString(),
    createdAt: toDate(chat.createdAt),
  };
}

function toDate(timestamp?: Timestamp): Date {
  if (!timestamp) return new Date();
  return new Date(Number(timestamp.seconds) * 1000);
}
