# affectify

ハッカソンチーム: affectify

## セットアップ

### 前提ツール

- [Go](https://go.dev/)
- [Bun](https://bun.sh/)
- [Buf CLI](https://buf.build/docs/installation)

### コード生成

proto を変更したら、必ず生成コードを更新する：

```bash
cd proto && buf generate
```

これで `backend/gen/` と `frontend/src/gen/` にコードが生成される。
生成コードは gitignore されているため、各自のローカルで実行が必要。

### バックエンド

```bash
cd backend
go mod tidy
go build ./...
go test ./...
```

### フロントエンド

```bash
cd frontend
bun install
bun run dev
```
