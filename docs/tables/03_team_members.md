# TeamMembers

チームとユーザーの多対多関係を管理

## テーブル定義

```sql
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
| id | UUID | レコードID |
| team_id | UUID | チームID (FK: teams) |
| user_id | UUID | ユーザーID (FK: users) |
| joined_at | TIMESTAMPTZ | 参加日時 |

権限管理なし。チームメンバーは全員平等。
