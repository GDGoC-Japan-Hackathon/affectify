# Backend

`backend` は Connect/Go ベースの API サーバ実装です。

## Quick Start

開発用 PostgreSQL 起動:

```bash
cd backend && docker compose up --build
```

バックエンド起動:

```bash
cd backend && go run ./cmd/server
```

Cloud SQL へ migration 適用:

```bash
cd backend && DB_PASSWORD=... ./scripts/migrate-cloud-sql.sh
```

## Documents

- [構造と依存関係](./docs/architecture.md)
- [認証・認可](./docs/auth.md)
- [データベース・Migration・生成コード](./docs/database.md)

## Main Tools

- Connect RPC
- Protocol Buffers + Buf
- PostgreSQL
- GORM
- `gorm/gen`
- Atlas
- Firebase Authentication
