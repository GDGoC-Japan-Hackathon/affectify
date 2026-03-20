# Proto

## Purpose

`proto/` は frontend と backend の共通 API 契約を管理する場所。

## Main Tools

- Protocol Buffers
- Buf
- Connect RPC

## What Lives Here

- `api/v1/*.proto`
- `buf.gen.go.yaml`
- `buf.gen.ts.yaml`

## Generation Policy

proto を変更したら、必ず生成コードを更新する。

```bash
cd /Users/siraiyuto/Projects/affectify/proto
buf generate
```

生成先:

- `backend/gen/`
- `frontend/src/gen/`

## Notes

- backend の Docker build では `backend/gen/` が必要
- frontend の build では `frontend/src/gen/` が必要
- proto だけ直して生成コードを更新しないと CI で落ちる
