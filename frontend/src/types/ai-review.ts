export type ChatMessage = {
  role: "user" | "ai";
  content: string;
  timestamp: Date;
};

export type Resolution = "update_design_guide" | "fix_code" | "both";

export type FeedbackCard = {
  id: string;
  type: "design_guide" | "code";
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  suggestion: string;
  filePaths?: string[];
  nodeIds?: string[];
  edgeIds?: string[];
  resolution?: Resolution;
  aiRecommendation?: Resolution;
  resolved: boolean;
  chatHistory: ChatMessage[];
};

export type AIReviewResult = {
  overallScore: number;
  summary: string;
  cards: FeedbackCard[];
};
