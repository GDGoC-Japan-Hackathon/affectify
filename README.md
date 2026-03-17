# WhiteCoder

ハッカソンチーム: WhiteCoder

## セットアップ

### 前提ツール

- [Go](https://go.dev/)
- [Bun](https://bun.sh/)
- [Buf CLI](https://buf.build/docs/installation)

### protobuf プラグインのインストール

`buf generate` で使うプラグインを各自のローカルにインストールする：

**Go:**

```bash
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install connectrpc.com/connect/cmd/protoc-gen-connect-go@latest
```

**TypeScript:**

```bash
cd frontend
bun add -D @bufbuild/protoc-gen-es @connectrpc/protoc-gen-connect-es
```

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
