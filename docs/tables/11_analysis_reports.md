# AnalysisReports

variant ごとの AI 分析結果の履歴を管理。1回の `review_job` に対する集約結果を保持し、カードやチャットの詳細は review 系テーブルに分離する。

## テーブル定義

```sql
CREATE TABLE analysis_reports (
  id SERIAL PRIMARY KEY,
  variant_id INTEGER NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
  review_job_id INTEGER REFERENCES review_jobs(id) ON DELETE SET NULL,
  overall_score INTEGER NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
  summary TEXT,
  report_data JSONB NOT NULL,
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## インデックス

```sql
CREATE INDEX idx_analysis_reports_variant_id ON analysis_reports(variant_id);
CREATE INDEX idx_analysis_reports_review_job_id ON analysis_reports(review_job_id);
CREATE INDEX idx_analysis_reports_overall_score ON analysis_reports(overall_score);
CREATE INDEX idx_analysis_reports_report_data ON analysis_reports USING GIN(report_data);
```

## フィールド説明

| フィールド | 型 | 説明 |
|-----------|------|------|
| id | SERIAL | レポートID |
| variant_id | INTEGER | 分析対象バリエーションID (FK: variants) |
| review_job_id | INTEGER | 生成元レビュージョブID (FK: review_jobs) |
| overall_score | INTEGER | 総合スコア（0-100） |
| summary | TEXT | レポート要約 |
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

## 設計メモ

- 全画面 AI review のカード一覧・チャット・解決状態は `review_feedbacks` 系テーブルで管理する
- `analysis_reports` は比較画面やプロジェクト一覧で使う集約値・履歴の保存先とする
- 設計書本文は `variant_design_guides` を上書き更新する前提なので、レビュー時点の設計書内容を残したくなったら `report_data` に要約またはコピーを保持する
