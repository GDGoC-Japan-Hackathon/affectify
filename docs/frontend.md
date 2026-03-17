# Frontend

## Purpose

`frontend` は WhiteCoder の UI を提供する。

## Main Tools

- Next.js
- Bun
- Firebase Authentication
- Connect client

## Local Run

```bash
cd /Users/siraiyuto/Projects/affectify/frontend
bun install
bun run dev
```

## Runtime Notes

frontend は Firebase の公開設定を使う。

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_API_BASE_URL`

`NEXT_PUBLIC_API_BASE_URL` をローカル backend に向けるか Cloud Run に向けるかで、接続先 backend が変わる。

## Authentication

ログインは Firebase Authentication を使う。

1. frontend で Google ログインする
2. ID token を backend RPC に付ける
3. backend が token を検証する
4. `SyncMe` / `GetMe` でアプリ内ユーザーを扱う
