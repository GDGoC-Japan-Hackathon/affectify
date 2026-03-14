# ActivityLogs

ユーザーのアクション履歴を管理

## テーブル定義

```sql
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  action_type VARCHAR(100) NOT NULL,
  action_description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## インデックス

```sql
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_project_id ON activity_logs(project_id);
CREATE INDEX idx_activity_logs_team_id ON activity_logs(team_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);
```

## フィールド説明

| フィールド | 型 | 説明 |
|-----------|------|------|
| id | UUID | ログID |
| user_id | UUID | アクション実行者 (FK: users) |
| project_id | UUID | 関連プロジェクトID (FK: projects) |
| team_id | UUID | 関連チームID (FK: teams) |
| action_type | VARCHAR(100) | アクション種別 |
| action_description | TEXT | アクション説明（表示用） |
| metadata | JSONB | 追加情報 |
| created_at | TIMESTAMPTZ | アクション実行日時 |

## アクション種別 (action_type)

| action_type | 説明 |
|-------------|------|
| create_project | プロジェクト作成 |
| update_project | プロジェクト更新 |
| delete_project | プロジェクト削除 |
| create_variant | バリエーション作成 |
| update_node | ノード更新 |
| create_edge | エッジ作成 |
| run_analysis | AI分析実行 |
| share_project | プロジェクト共有 |
| create_design_guide | 設計書作成 |
| fork_design_guide | 設計書フォーク |
| like_design_guide | 設計書いいね |
| join_team | チーム参加 |
| leave_team | チーム脱退 |
