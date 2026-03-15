# TeamMembers

チームとユーザーの多対多関係を管理

## テーブル定義

```sql
CREATE TABLE team_members (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);
```

## インデックス

```sql
CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
```

## フィールド説明

| フィールド | 型 | 説明 |
|-----------|------|------|
| id | SERIAL | レコードID |
| team_id | INTEGER | チームID (FK: teams) |
| user_id | INTEGER | ユーザーID (FK: users) |
| joined_at | TIMESTAMPTZ | 参加日時 |

権限管理なし。チームメンバーは全員平等。
