# Backend Authentication

## Purpose

このドキュメントは `backend` の認証・認可の入口を説明する。

## Adopted Tools

- Firebase Authentication
- Firebase Admin SDK
- Connect interceptor

## Authentication Flow

認証は Firebase Authentication を前提にする。

流れは次の通り。

1. frontend で Firebase ログインを行う
2. frontend が Firebase ID トークンを backend への RPC に付与する
3. backend が Firebase ID トークンを検証する
4. backend が `users.firebase_uid` でアプリ内ユーザーを解決する

## Current API

`UserService` の最小 API は次の 2 つ。

- `SyncMe`: Firebase の認証情報を `users` テーブルへ同期する
- `GetMe`: 認証済みユーザーに対応するアプリ内ユーザー情報を返す

初回ログイン時は `SyncMe` を先に呼び、その後は `GetMe` で自分の情報を取得する想定。

## Backend Environment Variables

Firebase Authentication を使う場合は、`backend/.env` または実行環境に次を設定する。

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CREDENTIALS_FILE`
- `FIREBASE_CREDENTIALS_JSON`

ローカルでは `FIREBASE_CREDENTIALS_FILE`、Cloud Run では Secret Manager 経由の `FIREBASE_CREDENTIALS_JSON` を使う想定。

## Frontend Environment Variables

frontend 側では別途 Firebase の公開設定が必要。

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_API_BASE_URL`

## Authorization Notes

現時点では認証基盤の最小実装まで入っている。

- 認証ヘッダーの検証
- `users.firebase_uid` を使ったユーザー解決
- private route への入口制御

今後は各 RPC ごとの認可条件を service / handler 側に足していく。
