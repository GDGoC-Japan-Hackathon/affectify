export type ChatMessage = {
  role: "user" | "ai";
  content: string;
  timestamp: Date;
};

export type Resolution = "update_design_guide" | "fix_code" | "both";
export type FeedbackStatus = "open" | "resolved" | "dismissed";
export type FeedbackType = "design_guide" | "code";
export type FeedbackSeverity = "high" | "medium" | "low";

export type FeedbackCard = {
  id: string;
  reviewJobId: string;
  variantId: string;
  type: FeedbackType;
  severity: FeedbackSeverity;
  title: string;
  description: string;
  suggestion: string;
  filePaths: string[];
  nodeIds: string[];
  edgeIds: string[];
  status: FeedbackStatus;
  resolution?: Resolution;
  aiRecommendation?: Resolution;
  resolved: boolean;
  chatHistory: ChatMessage[];
  chatsLoaded: boolean;
};

export type AIReviewResult = {
  overallScore: number | null;
  summary: string;
  cards: FeedbackCard[];
};
