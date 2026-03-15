# Backend Structure

`backend` は Connect/Go のバックエンド実装です。

## Directory Roles

### `cmd/server`

アプリケーションの起動ポイントです。

- 設定読み込み
- 依存関係の組み立て
- HTTP サーバ起動

ここには業務ロジックを書かず、起動処理だけを置きます。

### `cmd/genorm`

`gorm/gen` の生成コマンドです。

- `internal/repository/entity` を入力にする
- `internal/repository/query` に query code を生成する

`DATABASE_URL` を設定した上で実行します。

### `gen`

`buf generate` で生成されたコードです。

- protobuf の Go 型
- Connect のハンドラ/クライアント型

手で編集しません。

### `internal/handler`

RPC/HTTP の入口です。

- `buf` 生成型の request を受ける
- `service` を呼ぶ
- `buf` 生成型の response を返す

protobuf 依存は基本的にここで止めます。

### `internal/service`

業務ロジックの層です。

- handler から受けた入力を処理する
- repository を呼び出す
- 複数の処理を組み立てる

`service` は protobuf 型や DB 実装に直接依存しない方針です。

### `internal/entity`

アプリケーション内部で使う業務型です。

- service が扱う型
- handler と service の間で使う型

DB テーブル struct や protobuf 生成型はここに置きません。

### `internal/repository`

DB 操作や永続化処理を閉じ込める層です。

- SQL の実行
- 永続化処理
- DB 用 struct から `internal/entity` への変換

依存方向は `service -> repository` です。

### `internal/repository/entity`

DB テーブルやクエリ結果に対応する struct を置く場所です。

- table row 用 struct
- ORM や `db` tag を持つ struct

この層の型は repository の外へ漏らしすぎない方針です。

## Dependency Rules

依存方向は次を基本にします。

`handler -> service -> repository`

型の境界は次の通りです。

- protobuf 生成型は `handler` で使う
- 業務型は `internal/entity` に置く
- DB 用型は `internal/repository/entity` に置く

避けたい依存:

- `service` が protobuf 生成型を直接受け取ること
- `repository` が protobuf 生成型を使うこと
- `handler` が `repository` を直接呼ぶこと
