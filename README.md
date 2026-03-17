# WhiteCoder

WhiteCoder のモノレポ。  
ルート README は全体像だけを示し、詳細は `docs/` に集約する。

## Repository Structure

- `proto`
  API 契約と生成コードの元
- `frontend`
  Bun + Next.js のフロントエンド
- `backend`
  Connect/Go の API サーバ
- `infra`
  Terraform と GitHub Actions を含むデプロイ設定
- `docs`
  設計・運用・開発手順の集約先

## Reading Order

最初に読むと分かりやすい順番:

1. [docs/proto.md](./docs/proto.md)
2. [docs/frontend.md](./docs/frontend.md)
3. [docs/backend.md](./docs/backend.md)
4. [docs/database.md](./docs/database.md)
5. [docs/migration.md](./docs/migration.md)
6. [docs/infra.md](./docs/infra.md)

## Common Setup

必要なもの:

- Go
- Bun
- Buf CLI
- Atlas CLI
- Docker

Go 用 protobuf plugin:

```bash
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install connectrpc.com/connect/cmd/protoc-gen-connect-go@latest
```

TypeScript 用 protobuf plugin:

```bash
cd frontend
bun add -D @bufbuild/protoc-gen-es @connectrpc/protoc-gen-connect-es
```

## Main Commands

生成コード更新:

```bash
cd proto
buf generate
```

ローカル DB 起動:

```bash
cd backend
docker compose up --build
```

backend 起動:

```bash
cd backend
go run ./cmd/server
```

frontend 起動:

```bash
cd frontend
bun install
bun run dev
```

## More Docs

- [docs/proto.md](./docs/proto.md)
- [docs/frontend.md](./docs/frontend.md)
- [docs/backend.md](./docs/backend.md)
- [docs/database.md](./docs/database.md)
- [docs/migration.md](./docs/migration.md)
- [docs/infra.md](./docs/infra.md)
- [docs/TABLES.md](./docs/TABLES.md)
