# DesignGuides

設計パターン・アーキテクチャ指針のライブラリを管理。ここにある設計書はテンプレートや共有資産の原本であり、variant 上の編集中設計書は `variant_design_guides` に保持する。

## テーブル定義

```sql
CREATE TABLE design_guides (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  visibility VARCHAR(30) NOT NULL DEFAULT 'private',
  source_guide_id INTEGER REFERENCES design_guides(id) ON DELETE SET NULL,
  is_template BOOLEAN NOT NULL DEFAULT FALSE,
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## インデックス

```sql
CREATE INDEX idx_design_guides_created_by ON design_guides(created_by);
CREATE INDEX idx_design_guides_visibility ON design_guides(visibility);
CREATE INDEX idx_design_guides_is_template ON design_guides(is_template);
```

## フィールド説明

| フィールド | 型 | 説明 |
|-----------|------|------|
| id | SERIAL | 設計書ID |
| name | VARCHAR(255) | 設計書名 |
| description | TEXT | 説明 |
| content | TEXT | マークダウン形式の設計書本文 |
| visibility | VARCHAR(30) | 公開範囲: `private`, `project`, `public` |
| source_guide_id | INTEGER | 複製元設計書ID (FK: design_guides) |
| is_template | BOOLEAN | テンプレートとして公開するか |
| created_by | INTEGER | 作成者 (FK: users) |
| published_at | TIMESTAMPTZ | 公開日時 |
| created_at | TIMESTAMPTZ | 作成日時 |
| updated_at | TIMESTAMPTZ | 最終更新日時 |

## 設計メモ

- 設計書ライブラリ画面の原本を管理する
- variant に適用した後の編集内容は `variant_design_guides` にコピーして持つ
- 「お気に入りから作成」「テンプレートから作成」は `source_guide_id` を使って追跡できる

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
