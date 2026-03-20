# Projects

プロジェクトのメタ情報を管理。個人所有モデル。メンバー管理は `project_members` テーブルで行う。

## テーブル定義

```sql
CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## インデックス

```sql
CREATE INDEX idx_projects_owner_id ON projects(owner_id);
CREATE INDEX idx_projects_updated_at ON projects(updated_at DESC);
```

## フィールド説明

| フィールド | 型 | 説明 |
|-----------|------|------|
| id | SERIAL | プロジェクトID |
| name | VARCHAR(255) | プロジェクト名 |
| description | TEXT | プロジェクト説明 |
| owner_id | INTEGER | プロジェクト所有者 (FK: users) |
| created_at | TIMESTAMPTZ | 作成日時 |
| updated_at | TIMESTAMPTZ | 最終更新日時 |

## フロントエンド型との対応

フロントエンドの `Project` 型では以下のフィールドが計算値として含まれる:

| フロントエンド | 取得元 |
|--------------|--------|
| `nodeCount` | `variants` のメインバリアントの `nodeCount` から取得 |
| `analysisScore` | `analysis_reports` テーブルから最新のスコアを取得 |
| `variants` | `variants` テーブルから `project_id` で取得 |
| `members` | `project_members` テーブルから `project_id` で `user_id` の配列を取得 |

## RLS ポリシー

```sql
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- 閲覧: オーナーまたはメンバー
CREATE POLICY projects_select_policy ON projects
  FOR SELECT USING (
    auth.uid() = owner_id
    OR EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = projects.id
        AND pm.user_id = auth.uid()
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
