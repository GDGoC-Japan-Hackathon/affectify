export type NodeKind =
  | "function"
  | "method"
  | "interface"
  | "group"
  | "note"
  | "image";

export type EdgeKind = "call" | "import" | "implement";

export type EdgeStyle = "solid" | "dashed";

export interface BoardNode {
  id: string;
  kind: NodeKind;
  title: string;
  file_path: string;
  signature: string;
  receiver: string;
  x: number;
  y: number;
  code_text: string;
}

export interface BoardEdge {
  id: string;
  from_node_id: string;
  to_node_id: string;
  kind: EdgeKind;
  style: EdgeStyle;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  members: User[];
  createdBy: string;
  createdAt: Date;
}

export interface Variant {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  nodeCount: number;
  analysisScore?: number;
  isMain: boolean;
  parentVariantId?: string;
  designGuideId?: string;
}

export type ProjectVisibility = 'private' | 'teams';
export type DesignGuideVisibility = 'private' | 'team' | 'public';

export interface Project {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  nodeCount: number;
  analysisScore?: number;
  variants: Variant[];
  shareSettings: {
    visibility: ProjectVisibility;
    sharedWithTeams?: string[];
  };

  // AI分析結果
  analysisReport?: AnalysisReport;
}

export interface DesignGuide {
  id: string;
  name: string;
  description: string;
  visibility: DesignGuideVisibility;
  createdBy: string;
  teamId?: string;
  createdAt: Date;
  updatedAt: Date;
  content: string;

  // 統計（計算値）
  likeCount: number;
}

// AI分析レポート
export interface AnalysisReport {
  id: string;
  variantId: string;
  overallScore: number;
  analyzedAt: Date;
  reportData: {
    overview: {
      summary: string;
      purpose: string;
      techStack: string[];
    };
    architecture: {
      pattern: string;
      description: string;
      strengths: string[];
      weaknesses: string[];
    };
    dependencies: {
      totalCount: number;
      byType: {
        internal: number;
        external: number;
        circular: number;
      };
      issues: {
        type: 'circular' | 'tight-coupling' | 'missing';
        severity: 'high' | 'medium' | 'low';
        description: string;
        affectedNodes: string[];
      }[];
    };
    codeQuality: {
      overallScore: number;
      metrics: {
        maintainability: number;
        complexity: number;
        testability: number;
        reusability: number;
      };
    };
    recommendations: {
      id: string;
      priority: 'high' | 'medium' | 'low';
      category: 'architecture' | 'performance' | 'maintainability' | 'security';
      title: string;
      description: string;
      impact: string;
      effort: 'low' | 'medium' | 'high';
    }[];
    risks: {
      id: string;
      severity: 'critical' | 'high' | 'medium' | 'low';
      category: string;
      title: string;
      description: string;
      mitigation: string;
    }[];
  };
}
