# DesignGuides

設計パターン・アーキテクチャ指針のドキュメントを管理。

## テーブル定義

```sql
CREATE TABLE design_guides (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## インデックス

```sql
CREATE INDEX idx_design_guides_created_by ON design_guides(created_by);
```

## フィールド説明

| フィールド | 型 | 説明 |
|-----------|------|------|
| id | SERIAL | 設計書ID |
| name | VARCHAR(255) | 設計書名 |
| description | TEXT | 説明 |
| content | TEXT | マークダウン形式の設計書本文 |
| created_by | INTEGER | 作成者 (FK: users) |
| created_at | TIMESTAMPTZ | 作成日時 |
| updated_at | TIMESTAMPTZ | 最終更新日時 |

## 統計ビュー

いいね数は JOIN で集計:

```sql
CREATE OR REPLACE VIEW design_guide_stats AS
SELECT
  dg.id,
  dg.name,
  dg.description,
  dg.created_by,
  dg.created_at,
  dg.updated_at,
  COUNT(DISTINCT dgl.user_id) AS like_count
FROM design_guides dg
  LEFT JOIN design_guide_likes dgl ON dgl.design_guide_id = dg.id
GROUP BY dg.id;
```
