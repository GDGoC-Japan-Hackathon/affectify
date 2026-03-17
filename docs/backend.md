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
- 業務型は `internal/entity` に置く
- DB 用型は `internal/repository/entity` に置く

避けたい依存:

- `service` が protobuf 生成型を直接扱う
- `repository` が protobuf 生成型を扱う
- `handler` が `repository` を直接呼ぶ

## Important Directories

- `cmd/server`
  起動ポイント
- `cmd/genorm`
  `gorm/gen` の生成コマンド
- `cmd/atlasschema`
  Atlas 用 schema 出力コマンド
- `internal/handler`
  RPC / HTTP の入口
- `internal/service`
  業務ロジック
- `internal/repository`
  永続化処理
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

使い分け:

- ローカル: `FIREBASE_CREDENTIALS_FILE`
- Cloud Run: `FIREBASE_CREDENTIALS_JSON`
