# ActivityLogs

ユーザーのアクション履歴を管理

## テーブル定義

```sql
CREATE TABLE activity_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
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
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);
```

## フィールド説明

| フィールド | 型 | 説明 |
|-----------|------|------|
| id | SERIAL | ログID |
| user_id | INTEGER | アクション実行者 (FK: users) |
| project_id | INTEGER | 関連プロジェクトID (FK: projects) |
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
| invite_member | メンバー招待 |
| create_design_guide | 設計書作成 |
| like_design_guide | 設計書いいね |
