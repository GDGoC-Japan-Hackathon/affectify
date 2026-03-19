# GraphBuildJobs

variant の現在コードから `variant_files` / `nodes` / `edges` を生成・同期する非同期ジョブを管理。

## テーブル定義

```sql
CREATE TABLE graph_build_jobs (
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
CREATE INDEX idx_graph_build_jobs_variant_id ON graph_build_jobs(variant_id);
CREATE INDEX idx_graph_build_jobs_requested_by ON graph_build_jobs(requested_by);
CREATE INDEX idx_graph_build_jobs_status ON graph_build_jobs(status);
CREATE INDEX idx_graph_build_jobs_created_at ON graph_build_jobs(created_at DESC);
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

- worker は `variants.source_root_uri` からコードを読み、`variant_files` / `nodes` / `edges` を生成・同期する
- 既存 node の `x, y` は可能な限り維持し、新規 node のみ仮位置を与える
- graph build 完了時に `variants.last_imported_at` を更新する

## 必要な場面

- 初回取り込み
- ブラウザ上でのコード編集
- ファイル作成
- ファイル削除
- AI によるコード修正
- 分岐後の graph 確定
- 解析器のロジック変更後の再構築
