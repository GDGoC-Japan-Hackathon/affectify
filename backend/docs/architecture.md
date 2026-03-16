# Backend Architecture

## Purpose

このドキュメントは `backend` の構造と依存方向を説明する。

## Adopted Tools

- Connect RPC
- Protocol Buffers + Buf
- Go

## Directory Roles

### `cmd/server`

アプリケーションの起動ポイント。

- 設定読み込み
- 依存関係の組み立て
- HTTP サーバ起動

### `cmd/genorm`

`gorm/gen` の生成コマンド。

- `internal/repository/entity` を入力にする
- `internal/repository/query` に query code を生成する

### `cmd/atlasschema`

Atlas の program mode 用コマンド。

- `internal/repository/entity` から PostgreSQL schema を出力する
- Atlas が migration diff を作る時の schema source になる

### `gen`

`buf generate` で生成されたコード。

- protobuf の Go 型
- Connect のハンドラ/クライアント型

手で編集しない。

### `internal/handler`

RPC/HTTP の入口。

- `buf` 生成型の request を受ける
- `service` を呼ぶ
- `buf` 生成型の response を返す

protobuf 依存は基本的にここで止める。

### `internal/service`

業務ロジックの層。

- handler から受けた入力を処理する
- repository を呼び出す
- 複数の処理を組み立てる

### `internal/entity`

アプリケーション内部で使う業務型。

- service が扱う型
- handler と service の間で使う型

### `internal/repository`

DB 操作や永続化処理を閉じ込める層。

- SQL の実行
- 永続化処理
- DB 用 struct から `internal/entity` への変換

### `internal/repository/entity`

DB テーブルやクエリ結果に対応する struct を置く場所。

- table row 用 struct
- ORM や `db` tag を持つ struct

### `internal/repository/postgres`

PostgreSQL 接続の初期化を行う。

- PostgreSQL への接続
- GORM の初期設定

## Dependency Rules

依存方向は次を基本にする。

`handler -> service -> repository`

型の境界は次の通り。

- protobuf 生成型は `handler` で使う
- 業務型は `internal/entity` に置く
- DB 用型は `internal/repository/entity` に置く

避けたい依存:

- `service` が protobuf 生成型を直接受け取ること
- `repository` が protobuf 生成型を使うこと
- `handler` が `repository` を直接呼ぶこと
