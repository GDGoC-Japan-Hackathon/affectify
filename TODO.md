# TODO

## Import / Source Storage

- 現在の import は `multipart -> backend upload -> source_root_uri 更新 -> graph_build_job` で動かしている。
- この方式は当面維持でよい。local では `LocalStore`、GCP 環境では `GCSStore` を使う。
- 本命の高速化は `browser -> GCS direct upload (signed URL / resumable upload)` に寄せる。
- 将来は backend が upload session を発行し、frontend は GCS に直接 upload する。
- `variant.source_root_uri` は upload 完了後に backend 側で確定・更新する形へ寄せたい。
- コード実体は zip ではなく `GCS prefix 配下の展開済みファイル群` を正本にする。
- ファイル編集 API (`CreateFile`, `UpdateFileContent`, `DeleteFile`) は GCS 上の対象ファイルだけを更新する形にする。

## security

- 認可とかが怪しいところがある
-  frontend の page 自体は URL を打てば開けます。
   これは普通ですが、未許可ユーザーには「画面も開かせたくない」なら、frontend 側で 403 を見て明示的に弾く表示を入れたほうがいいです。


## problem
- GCP環境がないと確認がしずらいところが多くある
- workspaceが重たい


## TODO
- Go言語対応であることを明記
- データ分析によってAIを成長させる
- 