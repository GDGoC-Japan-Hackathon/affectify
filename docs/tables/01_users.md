# Users

ユーザーアカウント情報を管理。認証は Firebase Authentication を前提とする。

## テーブル定義

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  firebase_uid VARCHAR(128) UNIQUE NOT NULL,
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
CREATE INDEX idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX idx_users_email ON users(email);
```

## フィールド説明

| フィールド | 型 | 説明 |
|-----------|------|------|
| id | SERIAL | ユーザーID |
| firebase_uid | VARCHAR(128) | Firebase Authentication の UID（一意） |
| email | VARCHAR(255) | メールアドレス（一意） |
| name | VARCHAR(255) | 表示名 |
| avatar_url | TEXT | プロフィール画像URL |
| created_at | TIMESTAMPTZ | アカウント作成日時 |
| updated_at | TIMESTAMPTZ | 最終更新日時 |
| last_login_at | TIMESTAMPTZ | 最終ログイン日時 |

## 設計メモ

- 認証識別子は `firebase_uid` を使う
- `id` はアプリケーション内部の参照用 ID として使う
- 他テーブルの FK は従来どおり `users.id` を参照する
- Firebase の ID トークン検証後、`firebase_uid` で `users` を引いて内部 `id` に解決する

## RLS ポリシー

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 全ユーザーの基本情報は閲覧可能
CREATE POLICY users_select_policy ON users
  FOR SELECT USING (true);

-- 自分の情報のみ更新可能
-- auth.uid() は Firebase UID を返す前提
CREATE POLICY users_update_policy ON users
  FOR UPDATE USING (auth.uid()::text = firebase_uid);
```
