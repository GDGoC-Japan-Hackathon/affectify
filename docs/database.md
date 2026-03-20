# Database

## Purpose

このドキュメントは DB 接続方式と運用対象をまとめる。

## Main Tools

- PostgreSQL
- Cloud SQL for PostgreSQL
- Docker Compose
- GORM

## Local Database

開発用 PostgreSQL は `backend/compose.yml` で起動する。

```bash
cd /Users/siraiyuto/Projects/affectify/backend
docker compose up --build
```

frontend / backend を含むローカル起動全体は [local-development.md](/Users/siraiyuto/Projects/affectify/docs/local-development.md) を参照。

ホスト側の公開ポート:

- PostgreSQL: `5433`

## Connection Policy

backend の接続方針:

- `DATABASE_URL` があればそれを優先する
- なければ `DB_*` から DSN を組み立てる
- `INSTANCE_CONNECTION_NAME` がある場合は `/cloudsql/...` の Unix socket で Cloud SQL に接続する

主な環境変数:

- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `DB_SSLMODE`
- `INSTANCE_CONNECTION_NAME`

## Environments

- ローカル開発
  `backend/.env` + Docker Compose の PostgreSQL を使う
- dev / prod
  Cloud Run から Cloud SQL に接続する

## Data Safety

通常の backend 再デプロイでは Cloud SQL の中身は消えない。  
ただし migration の内容によってはデータに影響する。

例:

- カラム追加: 多くの場合データは残る
- カラム削除: その列のデータは消える
- テーブル drop / recreate: データは消える
