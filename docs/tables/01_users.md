# Users

ユーザーアカウント情報を管理

## テーブル定義

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);
```

## インデックス

```sql
CREATE INDEX idx_users_email ON users(email);
```

## フィールド説明

| フィールド | 型 | 説明 |
|-----------|------|------|
| id | UUID | ユーザーID |
| email | VARCHAR(255) | メールアドレス（一意） |
| name | VARCHAR(255) | 表示名 |
| avatar_url | TEXT | プロフィール画像URL |
| created_at | TIMESTAMPTZ | アカウント作成日時 |
| updated_at | TIMESTAMPTZ | 最終更新日時 |
| last_login_at | TIMESTAMPTZ | 最終ログイン日時 |

## RLS ポリシー

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 全ユーザーの基本情報は閲覧可能
CREATE POLICY users_select_policy ON users
  FOR SELECT USING (true);

-- 自分の情報のみ更新可能
CREATE POLICY users_update_policy ON users
  FOR UPDATE USING (auth.uid() = id);
```
