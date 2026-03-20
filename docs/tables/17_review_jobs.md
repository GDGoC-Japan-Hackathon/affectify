# ReviewJobs

variant に対する AI レビューの非同期ジョブを管理。

## テーブル定義

```sql
CREATE TABLE review_jobs (
  id SERIAL PRIMARY KEY,
  variant_id INTEGER NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
  requested_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## インデックス

```sql
CREATE INDEX idx_review_jobs_variant_id ON review_jobs(variant_id);
CREATE INDEX idx_review_jobs_requested_by ON review_jobs(requested_by);
CREATE INDEX idx_review_jobs_status ON review_jobs(status);
CREATE INDEX idx_review_jobs_created_at ON review_jobs(created_at DESC);
```

## フィールド説明

| フィールド | 型 | 説明 |
|-----------|------|------|
| id | SERIAL | ジョブID |
| variant_id | INTEGER | 対象 variant ID (FK: variants) |
| requested_by | INTEGER | 実行要求者 (FK: users) |
| status | VARCHAR(30) | 状態: `queued`, `running`, `succeeded`, `failed`, `canceled` |
| error_message | TEXT | 失敗理由 |
| started_at | TIMESTAMPTZ | 実行開始日時 |
| finished_at | TIMESTAMPTZ | 実行終了日時 |
| created_at | TIMESTAMPTZ | ジョブ作成日時 |

## 設計メモ

- 1回の review_job から `analysis_reports` と `review_feedbacks` が生成される
- レビュー入力の設計書は、その時点の `variant_design_guides` 現在値を使う
- 再評価は新しい review_job を積み重ねる
