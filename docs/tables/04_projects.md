# Projects

プロジェクトのメタ情報を管理。個人所有モデル。

## テーブル定義

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## インデックス

```sql
CREATE INDEX idx_projects_owner_id ON projects(owner_id);
CREATE INDEX idx_projects_tags ON projects USING GIN(tags);
CREATE INDEX idx_projects_updated_at ON projects(updated_at DESC);
```

## フィールド説明

| フィールド | 型 | 説明 |
|-----------|------|------|
| id | UUID | プロジェクトID |
| name | VARCHAR(255) | プロジェクト名 |
| description | TEXT | プロジェクト説明 |
| owner_id | UUID | プロジェクト所有者 (FK: users) |
| tags | TEXT[] | タグ配列（技術スタック、分類など） |
| created_at | TIMESTAMPTZ | 作成日時 |
| updated_at | TIMESTAMPTZ | 最終更新日時 |

## RLS ポリシー

```sql
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- 閲覧: オーナーまたは共有チームのメンバー
CREATE POLICY projects_select_policy ON projects
  FOR SELECT USING (
    auth.uid() = owner_id
    OR EXISTS (
      SELECT 1 FROM project_shares ps
      JOIN team_members tm ON tm.team_id = ps.team_id
      WHERE ps.project_id = projects.id
        AND tm.user_id = auth.uid()
    )
  );

-- 作成: 認証済みユーザー
CREATE POLICY projects_insert_policy ON projects
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- 更新・削除: オーナーのみ
CREATE POLICY projects_update_policy ON projects
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY projects_delete_policy ON projects
  FOR DELETE USING (auth.uid() = owner_id);
```
