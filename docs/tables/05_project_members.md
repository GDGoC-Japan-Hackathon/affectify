# ProjectMembers

プロジェクトとユーザーの多対多関係を管理。プロジェクトへの招待・参加を表す。

## テーブル定義

```sql
CREATE TABLE project_members (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invited_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
| joined_at | TIMESTAMPTZ | 参加日時 |

## アクセス制御

- プロジェクトオーナー (`projects.owner_id`) はメンバーの追加・削除が可能
- メンバー (`project_members.user_id`) はプロジェクトの閲覧・編集が可能
- オーナーは自動的にメンバーとしても登録される
