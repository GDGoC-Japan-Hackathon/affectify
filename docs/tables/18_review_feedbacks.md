# ReviewFeedbacks

AI 全画面モーダルに表示されるフィードバックカード本体を管理。

## テーブル定義

```sql
CREATE TABLE review_feedbacks (
  id SERIAL PRIMARY KEY,
  review_job_id INTEGER NOT NULL REFERENCES review_jobs(id) ON DELETE CASCADE,
  variant_id INTEGER NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
  feedback_type VARCHAR(30) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  suggestion TEXT NOT NULL,
  ai_recommendation VARCHAR(30),
  resolution VARCHAR(30),
  status VARCHAR(30) NOT NULL DEFAULT 'open',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## インデックス

```sql
CREATE INDEX idx_review_feedbacks_review_job_id ON review_feedbacks(review_job_id);
CREATE INDEX idx_review_feedbacks_variant_id ON review_feedbacks(variant_id);
CREATE INDEX idx_review_feedbacks_status ON review_feedbacks(status);
CREATE INDEX idx_review_feedbacks_severity ON review_feedbacks(severity);
```

## フィールド説明

| フィールド | 型 | 説明 |
|-----------|------|------|
| id | SERIAL | フィードバックID |
| review_job_id | INTEGER | 生成元レビュージョブID (FK: review_jobs) |
| variant_id | INTEGER | 対象 variant ID (FK: variants) |
| feedback_type | VARCHAR(30) | 種別: `design_guide`, `code` |
| severity | VARCHAR(20) | 重大度: `high`, `medium`, `low` |
| title | VARCHAR(255) | タイトル |
| description | TEXT | 問題説明 |
| suggestion | TEXT | 改善提案 |
| ai_recommendation | VARCHAR(30) | AI 推奨: `update_design_guide`, `fix_code`, `both` |
| resolution | VARCHAR(30) | 確定対応: `update_design_guide`, `fix_code`, `both` |
| status | VARCHAR(30) | 状態: `open`, `resolved`, `dismissed` |
| display_order | INTEGER | 表示順 |
| created_at | TIMESTAMPTZ | 作成日時 |

## 設計メモ

- サイドパネル・全画面モーダルのカード一覧の正本
- 現在の未解決カードは `status = 'open'` で取得する
- `ai_recommendation` は初回レビュー生成時だけでなく、カードごとの AI チャット中に更新されることがある
