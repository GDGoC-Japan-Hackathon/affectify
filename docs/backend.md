# Backend

## Purpose

`backend` は Connect/Go ベースの API サーバ。

## Main Tools

- Go
- Connect RPC
- Firebase Admin SDK
- GORM

## Layering

依存方向の基本は次の通り。

`handler -> service -> repository`

ルール:

- protobuf 生成型は `handler` で扱う
- DB 用型は `internal/repository/entity` に置く
- `service` は protobuf や GORM entity を直接返さず、必要なら service 配下の軽い型や集約 struct を返す
- 機能専用の中間表現はその package 配下に置く
  - 例: `internal/graphbuild/model.go`

避けたい依存:

- `service` が protobuf 生成型を直接扱う
- `repository` が protobuf 生成型を扱う
- `handler` が `repository` を直接呼ぶ

## Important Directories

- `cmd/server`
  起動ポイント
- `cmd/worker`
  Cloud Run Job から起動される worker の entrypoint
- `cmd/genorm`
  `gorm/gen` の生成コマンド
- `cmd/atlasschema`
  Atlas 用 schema 出力コマンド
- `cmd/seed`
  デモ用 seed データ投入コマンド
- `internal/handler`
  RPC / HTTP の入口
- `internal/service`
  業務ロジック
- `internal/graphbuild`
  graph build 用の parser と中間モデル
- `internal/repository`
  永続化処理と DB モデル
- `internal/repository/entity`
  GORM / Atlas / genorm の元になる DB entity
- `internal/repository/postgres`
  PostgreSQL 接続初期化
- `gen`
  protobuf / Connect の生成コード

## Local Run

```bash
cd /Users/siraiyuto/Projects/affectify/backend
go build ./...
go test ./...
go run ./cmd/server
```

ローカルの全体起動手順は [local-development.md](/Users/siraiyuto/Projects/affectify/docs/local-development.md) を参照。

デモ用データ投入:

```bash
cd /Users/siraiyuto/Projects/affectify/backend
go run ./cmd/seed --preset demo
```

## Authentication

backend の認証は Firebase Authentication を前提にする。

1. frontend から Firebase ID token を受ける
2. interceptor が token を検証する
3. `users.firebase_uid` でアプリ内ユーザーを解決する

現在の最小 API:

- `SyncMe`
- `GetMe`

## Runtime Settings

backend 側では次を使う。

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CREDENTIALS_FILE`
- `FIREBASE_CREDENTIALS_JSON`
- `GCP_PROJECT_ID`
- `GCP_REGION`
- `GRAPH_BUILD_JOB_NAME`
- `LAYOUT_JOB_NAME`
- `REVIEW_JOB_NAME`
- `SOURCE_BUCKET_NAME`

使い分け:

- ローカル: `FIREBASE_CREDENTIALS_FILE`
- Cloud Run: `FIREBASE_CREDENTIALS_JSON`

## Jobs

非同期処理は Cloud Run Job で動かす。

- API server は `graph_build_jobs` / `layout_jobs` / `review_jobs` の row を作る
- `internal/service/job_dispatcher.go` が Cloud Run Job を `run` する
- `cmd/worker` が `JOB_ID` を受けて対象 job を処理する

ローカルでは `GCP_PROJECT_ID` / `GCP_REGION` が未設定なら `LocalJobDispatcher` が使われ、backend プロセス内で worker を直接実行する。

現在の worker mode:

- `graph-build`
- `layout`
- `review`
