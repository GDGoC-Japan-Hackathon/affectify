# Backend Database

## Purpose

このドキュメントは `backend` の DB 接続、schema 管理、生成コード運用を説明する。

## Adopted Tools

- PostgreSQL
- Docker Compose
- GORM
- `gorm/gen`
- Atlas

## Local Database

開発用 PostgreSQL は `backend/compose.yml` で起動する。

```bash
cd backend && docker compose up --build
```

Compose では `postgres` だけを起動する。

ホスト側の公開ポート:

- PostgreSQL: `5433`

## Backend Runtime Settings

`backend/.env.example` に基本の環境変数を置いている。

- `DATABASE_URL`
- `APP_PORT`
- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `DB_SSLMODE`
- `INSTANCE_CONNECTION_NAME`

`DATABASE_URL` があればそれを優先し、未設定なら分解された `DB_*` から DSN を組み立てる。
`INSTANCE_CONNECTION_NAME` がある場合は Cloud SQL の Unix socket (`/cloudsql/...`) を使って接続する。

ローカル実行時は `backend/.env` を Go アプリが読む。

- `.env`: ローカルの backend から見た接続先を書く
- `compose.yml`: 開発用 PostgreSQL を起動する

この開発構成では `DB_HOST=localhost` `DB_PORT=5433` を使う。

## Backend Commands

バックエンド起動:

```bash
cd backend && go run ./cmd/server
```

`gorm/gen` 実行:

```bash
cd backend && go run ./cmd/genorm
```

## `gorm/gen`

`cmd/genorm` は `internal/repository/entity` を入力にして、`internal/repository/query` に query code を生成する。

運用方針:

1. entity を変更する
2. `go run ./cmd/genorm` を実行する
3. 生成物を Git 管理する

## Atlas

Atlas は migration 管理に使う。

`cmd/atlasschema` は `internal/repository/entity` から PostgreSQL schema を出力する。
Atlas はその schema を source として migration diff を生成する。

Atlas schema 出力確認:

```bash
cd backend && go run ./cmd/atlasschema
```

Atlas migration 生成:
生成される.sqlはgit管理すること

```bash
cd backend && atlas migrate diff <migration_name> --env local
```

Atlas migration 適用:
この時はPostgresの起動が必要

```bash
cd backend && atlas migrate apply --env local
```

Cloud SQL へ migration 適用:
CI/CDによって行われるので不要

```bash
cd backend && DB_PASSWORD=... ./scripts/migrate-cloud-sql.sh
```

このスクリプトは次をまとめて行う。

1. `cloud-sql-proxy` をバックグラウンドで起動する
2. `atlas migrate apply` を Cloud SQL に対して実行する
3. 終了時に proxy を停止する

必要なもの:

- `cloud-sql-proxy`
- `atlas`
- `DB_PASSWORD`

必要に応じて次の環境変数で上書きできる。

- `INSTANCE_CONNECTION_NAME`
- `DB_NAME`
- `DB_USER`
- `PROXY_PORT`

デフォルトでは `PROXY_PORT=15432` を使う。

`data.external_schema` を使っているため、Atlas CLI は公式版を前提にする。

最初の migration を切る時は、開発用 PostgreSQL が空に近い状態で実行すると initial schema が生成される。

## Migration Flow

1. `internal/repository/entity` を更新する
2. `go run ./cmd/genorm` で query code を再生成する
3. `atlas migrate diff <migration_name> --env local` で差分 migration を生成する
4. 生成された SQL をレビューする
5. `atlas migrate apply --env local` で適用する

## Files

- `backend/migrations`: Atlas の migration ファイル
- `backend/migrations/atlas.sum`: migration 群の整合性ハッシュ
