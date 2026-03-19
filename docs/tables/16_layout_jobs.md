# LayoutJobs

node の座標 `x, y` を再計算して保存する非同期ジョブを管理。構造更新と見た目の整列を分離するために、`graph_build_jobs` とは別テーブルにする。

## テーブル定義

```sql
CREATE TABLE layout_jobs (
  id SERIAL PRIMARY KEY,
  variant_id INTEGER NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
  requested_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  layout_type VARCHAR(30) NOT NULL,
  status VARCHAR(30) NOT NULL,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## インデックス

```sql
CREATE INDEX idx_layout_jobs_variant_id ON layout_jobs(variant_id);
CREATE INDEX idx_layout_jobs_requested_by ON layout_jobs(requested_by);
CREATE INDEX idx_layout_jobs_status ON layout_jobs(status);
CREATE INDEX idx_layout_jobs_created_at ON layout_jobs(created_at DESC);
```

## フィールド説明

| フィールド | 型 | 説明 |
|-----------|------|------|
| id | SERIAL | ジョブID |
| variant_id | INTEGER | 対象 variant ID (FK: variants) |
| requested_by | INTEGER | 実行要求者 (FK: users) |
| layout_type | VARCHAR(30) | レイアウト種別: `grid`, `circular`, `random`, `ai` |
| status | VARCHAR(30) | 状態: `queued`, `running`, `succeeded`, `failed`, `canceled` |
| error_message | TEXT | 失敗理由 |
| started_at | TIMESTAMPTZ | 実行開始日時 |
| finished_at | TIMESTAMPTZ | 実行終了日時 |
| created_at | TIMESTAMPTZ | ジョブ作成日時 |

## 設計メモ

- `graph_build_jobs` は構造更新、`layout_jobs` は座標更新を担当する
- 初回取り込み時のみ、graph build のあとに初期 layout を一度実行してよい
- 以後のコード変更では勝手に全体整列せず、明示操作時だけ実行する

## 必要な場面

- 初回表示の初期配置
- 自動整列ボタン
- レイアウト方式変更
- AI による見やすい再配置
