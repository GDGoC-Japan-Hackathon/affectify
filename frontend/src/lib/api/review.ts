import { create } from "@bufbuild/protobuf";

import { createConnectClient } from "@/lib/connect";
import {
  AppendReviewFeedbackChatRequestSchema,
  CreateReviewApplyJobRequestSchema,
  CreateReviewJobRequestSchema,
  GenerateReviewResolutionDraftRequestSchema,
  GetReviewApplyJobRequestSchema,
  GetReviewJobRequestSchema,
  ListReviewFeedbackChatsRequestSchema,
  ListReviewFeedbacksRequestSchema,
  ReviewFeedbackChatRole,
  ReviewFeedbackReaction,
  ReviewFeedbackResolution,
  ReviewFeedbackSeverity,
  ReviewFeedbackStatus,
  ReviewFeedbackType,
  ResolveReviewFeedbackRequestSchema,
  RateReviewFeedbackRequestSchema,
  ReviewService,
  type ReviewFeedback as ProtoReviewFeedback,
  type ReviewFeedbackChat as ProtoReviewFeedbackChat,
  type ReviewFeedbackTarget as ProtoReviewFeedbackTarget,
  type ReviewApplyJob as ProtoReviewApplyJob,
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

export interface ReviewApplyJob {
  id: string;
  variantId: string;
  reviewJobId: string;
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
  resolutionNote: string;
  status: string;
  displayOrder: number;
  createdAt: Date;
  userReaction: string;
}

export interface ReviewFeedbackTarget {
  id: string;
  feedbackId: string;
  nodeId?: string;
  edgeId?: string;
  filePath?: string;
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

export async function createReviewApplyJob(reviewJobId: string): Promise<ReviewApplyJob> {
  const response = await reviewClient.createReviewApplyJob(
    create(CreateReviewApplyJobRequestSchema, {
      reviewJobId: BigInt(reviewJobId),
    }),
  );

  if (!response.job) {
    throw new Error("適用ジョブの作成に失敗しました");
  }

  return mapReviewApplyJob(response.job);
}

export async function getReviewApplyJob(id: string): Promise<ReviewApplyJob> {
  const response = await reviewClient.getReviewApplyJob(
    create(GetReviewApplyJobRequestSchema, {
      id: BigInt(id),
    }),
  );

  if (!response.job) {
    throw new Error("適用ジョブの取得に失敗しました");
  }

  return mapReviewApplyJob(response.job);
}

export async function listReviewFeedbacks(options: ListReviewFeedbacksOptions): Promise<{
  feedbacks: ReviewFeedback[];
  targets: ReviewFeedbackTarget[];
}> {
  if (!options.variantId) {
    return { feedbacks: [], targets: [] };
  }
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

export async function generateReviewResolutionDraft(
  feedbackId: string,
  resolution: "update_design_guide" | "fix_code" | "both",
): Promise<string> {
  const response = await reviewClient.generateReviewResolutionDraft(
    create(GenerateReviewResolutionDraftRequestSchema, {
      feedbackId: BigInt(feedbackId),
      resolution: toProtoResolution(resolution),
    }),
  );

  return response.resolutionNote;
}

export async function resolveReviewFeedback(
  feedbackId: string,
  resolution: string,
  resolutionNote = "",
  status = "resolved",
): Promise<ReviewFeedback> {
  const response = await reviewClient.resolveReviewFeedback(
    create(ResolveReviewFeedbackRequestSchema, {
      feedbackId: BigInt(feedbackId),
      resolution: toProtoResolution(resolution),
      status: toProtoStatus(status),
      resolutionNote,
    }),
  );

  if (!response.feedback) {
    throw new Error("フィードバックの解決に失敗しました");
  }

  return mapReviewFeedback(response.feedback);
}

export async function rateReviewFeedback(
  feedbackId: string,
  reaction: "good" | "bad",
): Promise<ReviewFeedback> {
  const response = await reviewClient.rateReviewFeedback(
    create(RateReviewFeedbackRequestSchema, {
      feedbackId: BigInt(feedbackId),
      reaction: toProtoReaction(reaction),
    }),
  );

  if (!response.feedback) {
    throw new Error("フィードバック評価の保存に失敗しました");
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
    feedbackType: fromProtoFeedbackType(feedback.feedbackType),
    severity: fromProtoSeverity(feedback.severity),
    title: feedback.title,
    description: feedback.description,
    suggestion: feedback.suggestion,
    aiRecommendation: fromProtoResolution(feedback.aiRecommendation),
    resolution: fromProtoResolution(feedback.resolution),
    resolutionNote: feedback.resolutionNote,
    status: fromProtoStatus(feedback.status),
    displayOrder: feedback.displayOrder,
    createdAt: toDate(feedback.createdAt),
    userReaction: fromProtoReaction(feedback.userReaction),
  };
}

function mapReviewApplyJob(job: ProtoReviewApplyJob): ReviewApplyJob {
  return {
    id: job.id.toString(),
    variantId: job.variantId.toString(),
    reviewJobId: job.reviewJobId.toString(),
    status: job.status,
    errorMessage: job.errorMessage,
    startedAt: job.startedAt ? toDate(job.startedAt) : null,
    finishedAt: job.finishedAt ? toDate(job.finishedAt) : null,
    createdAt: toDate(job.createdAt),
  };
}

function mapReviewFeedbackTarget(target: ProtoReviewFeedbackTarget): ReviewFeedbackTarget {
  return {
    id: target.id.toString(),
    feedbackId: target.feedbackId.toString(),
    nodeId: target.nodeId?.toString(),
    edgeId: target.edgeId?.toString(),
    filePath: target.filePath,
  };
}

function mapReviewFeedbackChat(chat: ProtoReviewFeedbackChat): ReviewFeedbackChat {
  return {
    id: chat.id.toString(),
    feedbackId: chat.feedbackId.toString(),
    role: fromProtoChatRole(chat.role),
    content: chat.content,
    createdBy: chat.createdBy?.toString(),
    createdAt: toDate(chat.createdAt),
  };
}

function fromProtoFeedbackType(value: ReviewFeedbackType): string {
  switch (value) {
    case ReviewFeedbackType.DESIGN_GUIDE:
      return "design_guide";
    case ReviewFeedbackType.CODE:
      return "code";
    default:
      return "";
  }
}

function fromProtoSeverity(value: ReviewFeedbackSeverity): string {
  switch (value) {
    case ReviewFeedbackSeverity.HIGH:
      return "high";
    case ReviewFeedbackSeverity.MEDIUM:
      return "medium";
    case ReviewFeedbackSeverity.LOW:
      return "low";
    default:
      return "";
  }
}

function fromProtoResolution(value: ReviewFeedbackResolution): string {
  switch (value) {
    case ReviewFeedbackResolution.UPDATE_DESIGN_GUIDE:
      return "update_design_guide";
    case ReviewFeedbackResolution.FIX_CODE:
      return "fix_code";
    case ReviewFeedbackResolution.BOTH:
      return "both";
    default:
      return "";
  }
}

function fromProtoStatus(value: ReviewFeedbackStatus): string {
  switch (value) {
    case ReviewFeedbackStatus.OPEN:
      return "open";
    case ReviewFeedbackStatus.RESOLVED:
      return "resolved";
    case ReviewFeedbackStatus.DISMISSED:
      return "dismissed";
    default:
      return "";
  }
}

function fromProtoReaction(value: ReviewFeedbackReaction): string {
  switch (value) {
    case ReviewFeedbackReaction.GOOD:
      return "good";
    case ReviewFeedbackReaction.BAD:
      return "bad";
    default:
      return "";
  }
}

function fromProtoChatRole(value: ReviewFeedbackChatRole): string {
  switch (value) {
    case ReviewFeedbackChatRole.AI:
      return "ai";
    case ReviewFeedbackChatRole.USER:
      return "user";
    default:
      return "user";
  }
}

function toProtoResolution(value: string): ReviewFeedbackResolution {
  switch (value) {
    case "update_design_guide":
      return ReviewFeedbackResolution.UPDATE_DESIGN_GUIDE;
    case "fix_code":
      return ReviewFeedbackResolution.FIX_CODE;
    case "both":
      return ReviewFeedbackResolution.BOTH;
    default:
      return ReviewFeedbackResolution.UNSPECIFIED;
  }
}

function toProtoStatus(value: string): ReviewFeedbackStatus {
  switch (value) {
    case "open":
      return ReviewFeedbackStatus.OPEN;
    case "resolved":
      return ReviewFeedbackStatus.RESOLVED;
    case "dismissed":
      return ReviewFeedbackStatus.DISMISSED;
    default:
      return ReviewFeedbackStatus.UNSPECIFIED;
  }
}

function toProtoReaction(value: string): ReviewFeedbackReaction {
  switch (value) {
    case "good":
      return ReviewFeedbackReaction.GOOD;
    case "bad":
      return ReviewFeedbackReaction.BAD;
    default:
      return ReviewFeedbackReaction.UNSPECIFIED;
  }
}

function toDate(timestamp?: Timestamp): Date {
  if (!timestamp) return new Date();
  return new Date(Number(timestamp.seconds) * 1000);
}
