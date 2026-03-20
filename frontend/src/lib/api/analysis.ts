import { create } from "@bufbuild/protobuf";

import { createConnectClient } from "@/lib/connect";
import {
  AnalysisService,
  GetAnalysisReportRequestSchema,
  RunAnalysisRequestSchema,
} from "@/gen/api/v1/analysis_pb";
import type { AnalysisReport } from "@/types/type";
import type { Timestamp } from "@bufbuild/protobuf/wkt";

const analysisClient = createConnectClient(AnalysisService);

export async function runAnalysis(variantId: string): Promise<AnalysisReport> {
  const response = await analysisClient.runAnalysis(
    create(RunAnalysisRequestSchema, {
      variantId: BigInt(variantId),
    }),
  );

  if (!response.report) {
    throw new Error("分析の実行に失敗しました");
  }

  return mapAnalysisReport(response.report);
}

export async function getAnalysisReport(variantId: string): Promise<AnalysisReport | null> {
  try {
    const response = await analysisClient.getAnalysisReport(
      create(GetAnalysisReportRequestSchema, {
        variantId: BigInt(variantId),
      }),
    );

    if (!response.report) {
      return null;
    }

    return mapAnalysisReport(response.report);
  } catch {
    return null;
  }
}

function mapAnalysisReport(report: {
  id: bigint;
  variantId: bigint;
  overallScore: number;
  reportData?: Record<string, unknown>;
  analyzedAt?: Timestamp;
  createdAt?: Timestamp;
}): AnalysisReport {
  const data = (report.reportData ?? {}) as Record<string, unknown>;

  return {
    id: report.id.toString(),
    variantId: report.variantId.toString(),
    overallScore: report.overallScore,
    analyzedAt: toDate(report.analyzedAt),
    reportData: {
      overview: (data.overview as AnalysisReport["reportData"]["overview"]) ?? {
        summary: "",
        purpose: "",
        techStack: [],
      },
      architecture: (data.architecture as AnalysisReport["reportData"]["architecture"]) ?? {
        pattern: "",
        description: "",
        strengths: [],
        weaknesses: [],
      },
      dependencies: (data.dependencies as AnalysisReport["reportData"]["dependencies"]) ?? {
        totalCount: 0,
        byType: { internal: 0, external: 0, circular: 0 },
        issues: [],
      },
      codeQuality: (data.codeQuality as AnalysisReport["reportData"]["codeQuality"]) ?? {
        overallScore: 0,
        metrics: { maintainability: 0, complexity: 0, testability: 0, reusability: 0 },
      },
      recommendations: (data.recommendations as AnalysisReport["reportData"]["recommendations"]) ?? [],
      risks: (data.risks as AnalysisReport["reportData"]["risks"]) ?? [],
    },
  };
}

function toDate(timestamp?: Timestamp): Date {
  if (!timestamp) return new Date();
  return new Date(Number(timestamp.seconds) * 1000);
}
