# Local Development

## Purpose

このドキュメントは、frontend / backend / database をローカルでまとめて起動し、必要に応じて worker も試すための最短手順をまとめる。

関連:

- [frontend.md](/Users/siraiyuto/Projects/affectify/docs/frontend.md)
- [backend.md](/Users/siraiyuto/Projects/affectify/docs/backend.md)
- [database.md](/Users/siraiyuto/Projects/affectify/docs/database.md)
- [migration.md](/Users/siraiyuto/Projects/affectify/docs/migration.md)

## Overview

ローカル開発の基本構成は次の通り。

- database
  PostgreSQL を `backend/compose.yml` で起動する
- backend
  Connect RPC サーバをローカルで起動する
- frontend
  Next.js dev server をローカルで起動する

通常はこの 3 つで十分。

worker は次の 2 パターンがある。

- backend から job を作ったときに自動でローカル実行
  `GCP_PROJECT_ID` / `GCP_REGION` が未設定なら `LocalJobDispatcher` が動く
- 手動で worker を起動
  `go run ./cmd/worker graph-build` などで試す

## 1. Database

```bash
cd /Users/siraiyuto/Projects/affectify/backend
docker compose up --build
```

ローカル公開ポート:

- PostgreSQL: `5433`

## 2. Backend Env

backend は `backend/.env` を読む。

最低限の例:

```env
DB_HOST=localhost
DB_PORT=5433
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=affectify
DB_SSLMODE=disable

FIREBASE_PROJECT_ID=YOUR_FIREBASE_PROJECT_ID
FIREBASE_CREDENTIALS_FILE=/absolute/path/to/firebase-admin.json
```

補足:

- `DATABASE_URL` があればそれを優先する
- ローカルでは `GCP_PROJECT_ID` と `GCP_REGION` は未設定でよい
  未設定だと Cloud Run Job は叩かず、backend 内で worker を直接実行する

## 3. Backend Run

```bash
cd /Users/siraiyuto/Projects/affectify/backend
go run ./cmd/server
```

疎通確認:

```bash
curl -i \
  -X POST \
  http://localhost:8080/api.v1.HealthService/HealthCheck \
  -H 'Content-Type: application/json' \
  -d '{}'
```

## 4. Frontend Env

frontend は `.env.local` を読む。

最低限の例:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_FIREBASE_APP_ID
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

## 5. Frontend Run

```bash
cd /Users/siraiyuto/Projects/affectify/frontend
bun install
bun run dev
```

起動後:

- ブラウザでログインする
- 初回は `SyncMe` で backend の `users` に同期される
- project / variant / review 系 API は Firebase 認証前提

## 6. Migration

schema を変えた場合:

```bash
cd /Users/siraiyuto/Projects/affectify/backend
go run ./cmd/genorm
go run ./cmd/atlasschema > /tmp/atlas-schema.sql
atlas migrate diff <migration_name> --env local
atlas migrate apply --env local
```

詳しくは [migration.md](/Users/siraiyuto/Projects/affectify/docs/migration.md) を参照。

## 7. Local Jobs

### API 経由で job を作る場合

ローカルでは `GCP_PROJECT_ID` / `GCP_REGION` が未設定なら Cloud Run Job を呼ばず、backend が同プロセス内で worker を非同期実行する。

つまり:

- `CreateGraphBuildJob`
- `CreateLayoutJob`
- `CreateReviewJob`

を API で作ると、そのままローカルで処理される。

### worker を手動で実行する場合

```bash
cd /Users/siraiyuto/Projects/affectify/backend
JOB_ID=1 go run ./cmd/worker graph-build
JOB_ID=2 go run ./cmd/worker layout
JOB_ID=3 go run ./cmd/worker review
```

mode:

- `graph-build`
- `layout`
- `review`

## 8. Graph Build Source

`graph-build` は `variants.source_root_uri` を読む。

ローカルでは次を使える。

- `file:///absolute/path/to/source`
- `/absolute/path/to/source`

Cloud 側では次を使う。

- `gs://bucket/path/to/source`

ローカルで graph-build を試すときは、対象 variant の `source_root_uri` をローカルディレクトリに向けておく。

## 9. Typical Local Flow

1. `backend/docker compose up --build` で DB 起動
2. `backend/go run ./cmd/server` で backend 起動
3. `frontend/bun run dev` で frontend 起動
4. ログイン
5. project / variant を作成
6. 必要なら `source_root_uri` をローカル path に設定
7. graph build job を作成して workspace を確認

## 10. Notes

- Cloud Run Job の env は Terraform 管理だが、ローカルでは不要
- `source_root_uri` が空だと graph-build は失敗する
- Firebase 認証が通らないと project / variant / review API は使えない
