# DesignGuides

設計パターン・アーキテクチャ指針のドキュメントを管理。公開範囲は private / team / public の3段階。

## テーブル定義

```sql
CREATE TABLE design_guides (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  visibility VARCHAR(20) NOT NULL CHECK (visibility IN ('private', 'team', 'public')),
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## インデックス

```sql
CREATE INDEX idx_design_guides_created_by ON design_guides(created_by);
CREATE INDEX idx_design_guides_team_id ON design_guides(team_id);
CREATE INDEX idx_design_guides_visibility ON design_guides(visibility);
```

## フィールド説明

| フィールド | 型 | 説明 |
|-----------|------|------|
| id | SERIAL | 設計書ID |
| name | VARCHAR(255) | 設計書名 |
| description | TEXT | 説明 |
| content | TEXT | マークダウン形式の設計書本文 |
| visibility | VARCHAR(20) | 公開範囲: `private`, `team`, `public` |
| created_by | INTEGER | 作成者 (FK: users) |
| team_id | INTEGER | チームID、team visibilityの場合 (FK: teams) |
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
  dg.visibility,
  dg.created_by,
  dg.created_at,
  dg.updated_at,
  COUNT(DISTINCT dgl.user_id) AS like_count
FROM design_guides dg
  LEFT JOIN design_guide_likes dgl ON dgl.design_guide_id = dg.id
GROUP BY dg.id;
```

## RLS ポリシー

```sql
ALTER TABLE design_guides ENABLE ROW LEVEL SECURITY;

-- 閲覧: 公開、オーナー、またはチームメンバー
CREATE POLICY design_guides_select_policy ON design_guides
  FOR SELECT USING (
    visibility = 'public'
    OR created_by = auth.uid()
    OR (
      visibility = 'team'
      AND EXISTS (
        SELECT 1 FROM team_members tm
        WHERE tm.team_id = design_guides.team_id
          AND tm.user_id = auth.uid()
      )
    )
  );

-- 作成・更新・削除: オーナーのみ
CREATE POLICY design_guides_insert_policy ON design_guides
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY design_guides_update_policy ON design_guides
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY design_guides_delete_policy ON design_guides
  FOR DELETE USING (auth.uid() = created_by);
```
