# AnalysisReports

バリエーションごとのAI分析結果を管理。レポート内容は JSONB で格納。

## テーブル定義

```sql
CREATE TABLE analysis_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  variant_id UUID NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
  overall_score INTEGER NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
  report_data JSONB NOT NULL,
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## インデックス

```sql
CREATE INDEX idx_analysis_reports_variant_id ON analysis_reports(variant_id);
CREATE INDEX idx_analysis_reports_overall_score ON analysis_reports(overall_score);
CREATE INDEX idx_analysis_reports_report_data ON analysis_reports USING GIN(report_data);
```

## フィールド説明

| フィールド | 型 | 説明 |
|-----------|------|------|
| id | UUID | レポートID |
| variant_id | UUID | 分析対象バリエーションID (FK: variants) |
| overall_score | INTEGER | 総合スコア（0-100） |
| report_data | JSONB | レポート全内容（下記構造参照） |
| analyzed_at | TIMESTAMPTZ | 分析実行日時 |
| created_at | TIMESTAMPTZ | レコード作成日時 |

## report_data の構造

```jsonc
{
  "overview": {
    "summary": "プロジェクトの概要",
    "purpose": "目的",
    "techStack": ["Go", "React", "PostgreSQL"]
  },
  "architecture": {
    "pattern": "Clean Architecture",
    "description": "アーキテクチャの説明",
    "strengths": ["強み1", "強み2"],
    "weaknesses": ["弱点1", "弱点2"]
  },
  "dependencies": {
    "totalCount": 42,
    "byType": {
      "internal": 30,
      "external": 10,
      "circular": 2
    },
    "issues": [
      {
        "type": "circular",           // "circular" | "tight-coupling" | "missing"
        "severity": "high",           // "high" | "medium" | "low"
        "description": "問題の説明",
        "affectedNodes": ["node-id-1", "node-id-2"]
      }
    ]
  },
  "codeQuality": {
    "overallScore": 78,
    "metrics": {
      "maintainability": 80,
      "complexity": 65,
      "testability": 75,
      "reusability": 85
    },
  },
  "recommendations": [
    {
      "id": "rec-1",
      "priority": "high",            // "high" | "medium" | "low"
      "category": "architecture",    // "architecture" | "performance" | "maintainability" | "security"
      "title": "推奨タイトル",
      "description": "推奨内容",
      "impact": "影響範囲",
      "effort": "medium"             // "low" | "medium" | "high"
    }
  ],
  "risks": [
    {
      "id": "risk-1",
      "severity": "high",            // "critical" | "high" | "medium" | "low"
      "category": "カテゴリ",
      "title": "リスクタイトル",
      "description": "リスク説明",
      "mitigation": "軽減策"
    }
  ]
}
```
