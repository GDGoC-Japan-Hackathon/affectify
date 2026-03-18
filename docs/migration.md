# Migration

## Purpose

schema 変更は Atlas で管理する。

## Main Tools

- Atlas
- GORM entity
- Cloud SQL Auth Proxy

## Local Flow

1. `internal/repository/entity` を更新する
2. query code を再生成する
3. migration diff を生成する
4. 生成された SQL をレビューする
5. migration を適用する

`gorm/gen`:

```bash
cd /Users/siraiyuto/Projects/affectify/backend
go run ./cmd/genorm
```

Atlas schema 出力確認:

```bash
cd /Users/siraiyuto/Projects/affectify/backend
go run ./cmd/atlasschema
```

diff 生成:

```bash
cd /Users/siraiyuto/Projects/affectify/backend
atlas migrate diff <migration_name> --env local
```

ローカル DB へ適用:
Docker不必要

```bash
cd /Users/siraiyuto/Projects/affectify/backend
atlas migrate apply --env local
```

## Cloud SQL Migration

Cloud SQL 向けには script を使う。

```bash
cd /Users/siraiyuto/Projects/affectify/backend
DB_PASSWORD=... ./scripts/migrate-cloud-sql.sh
```

この script が行うこと:

1. `cloud-sql-proxy` を起動する
2. `atlas migrate apply` を Cloud SQL に対して実行する
3. 終了時に proxy を停止する

必要なもの:

- `cloud-sql-proxy`
- `atlas`
- `DB_PASSWORD`

上書きできる環境変数:

- `INSTANCE_CONNECTION_NAME`
- `DB_NAME`
- `DB_USER`
- `PROXY_PORT`

デフォルトでは `PROXY_PORT=15432` を使う。

## Demo Seed

デモ確認用のデータ投入は migration と分けて扱う。

ローカル DB へ投入:

```bash
cd /Users/siraiyuto/Projects/affectify/backend
go run ./cmd/seed --preset demo
```

Cloud SQL へ投入:

```bash
cd /Users/siraiyuto/Projects/affectify/backend
DB_PASSWORD=... ./scripts/seed-cloud-sql.sh
```

この seed は冪等に作ってあり、同じ preset を複数回流しても重複作成しにくい前提で動く。

## Generated Files

- `backend/migrations`
- `backend/migrations/atlas.sum`

migration SQL は Git 管理する。
