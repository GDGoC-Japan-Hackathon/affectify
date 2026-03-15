# ProjectShares

プロジェクトとチームの共有関係を管理

## テーブル定義

```sql
CREATE TABLE project_shares (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  shared_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shared_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, team_id)
);
```

## インデックス

```sql
CREATE INDEX idx_project_shares_project_id ON project_shares(project_id);
CREATE INDEX idx_project_shares_team_id ON project_shares(team_id);
```

## フィールド説明

| フィールド | 型 | 説明 |
|-----------|------|------|
| id | SERIAL | レコードID |
| project_id | INTEGER | プロジェクトID (FK: projects) |
| team_id | INTEGER | 共有先チームID (FK: teams) |
| shared_by | INTEGER | 共有実行者 (FK: users) |
| shared_at | TIMESTAMPTZ | 共有日時 |

## アクセス制御

- プロジェクトオーナー (`projects.owner_id`) は常にアクセス可能
- 共有されたチーム (`project_shares.team_id`) のメンバーはアクセス可能
