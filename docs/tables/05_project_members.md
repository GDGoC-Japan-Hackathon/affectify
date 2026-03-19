# ProjectMembers

プロジェクトとユーザーの多対多関係を管理。プロジェクトへの招待・参加と権限を表す。

## テーブル定義

```sql
CREATE TABLE project_members (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invited_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(30) NOT NULL DEFAULT 'editor',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);
```

## インデックス

```sql
CREATE INDEX idx_project_members_project_id ON project_members(project_id);
CREATE INDEX idx_project_members_user_id ON project_members(user_id);
```

## フィールド説明

| フィールド | 型 | 説明 |
|-----------|------|------|
| id | SERIAL | レコードID |
| project_id | INTEGER | プロジェクトID (FK: projects) |
| user_id | INTEGER | メンバーのユーザーID (FK: users) |
| invited_by | INTEGER | 招待したユーザーID (FK: users) |
| role | VARCHAR(30) | プロジェクト内ロール: `viewer`, `editor`, `admin` |
| joined_at | TIMESTAMPTZ | 参加日時 |

## アクセス制御

- プロジェクトオーナー (`projects.owner_id`) はメンバーの追加・削除が可能
- `admin` はメンバー管理と設計案管理が可能
- `editor` はプロジェクトの閲覧・編集が可能
- `viewer` は閲覧のみ可能
- オーナーは自動的にメンバーとしても登録される
