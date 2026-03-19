# インポートフロー設計

## 目的

巨大なフォルダをそのまま取り込むと workspace と AI レビュー対象が膨らみすぎるため、取り込み前に対象を選別できるインポートフローを定義する。

このドキュメントでは以下を整理する。

- フォルダ選択後の UI フロー
- どの単位でファイルを設計案に含めるか
- `variant_files` / `variants.source_root_uri` / `graph_build_jobs` との関係
- AI レビューとの接続

関連ドキュメント:

- [テーブル一覧](./TABLES.md)
- [VariantFiles](./tables/13_variant_files.md)
- [Variants](./tables/06_variants.md)
- [GraphBuildJobs](./tables/15_graph_build_jobs.md)
- [LayoutJobs](./tables/16_layout_jobs.md)
- [Vertex AI レビュー実行フロー](./vertex-ai-review-flow.md)
- [リアルタイム共同編集設計メモ](./realtime-collaboration.md)

---

## 基本方針

インポートは単純な「フォルダを選んだら全部取り込む」動作ではなく、次の 2 段階に分ける。

1. ルートフォルダを選ぶ
2. 配下のファイル・ディレクトリから取り込み対象を選ぶ

この方針により、巨大なコードベースの一部だけを設計案に含められる。

---

## 設計案との関係

`variant` は 1 つの設計案の作業単位である。

インポート結果として、その設計案に含まれるファイル一覧が決まる。

つまり、

- 取り込み対象として選ばれたファイルだけが `variant_files` に載る
- そのコード実体のルートが `variants.source_root_uri` に保存される
- そのファイル群から `nodes`, `edges` が生成される

したがって、インポート時の選択は「この設計案に何を含めるか」を決める操作である。

---

## 想定フロー

### Step 1. ルートフォルダ選択

ユーザーが取り込み元のルートフォルダを選ぶ。

例:

- プロジェクト全体
- `backend/`
- `src/`

### Step 1.5. GCS アップロード準備

アップロード方式は browser から GCS への direct upload を基本とする。

流れ:

1. frontend が backend に upload session を要求する
2. backend が signed URL もしくは resumable upload session を発行する
3. frontend が選択ファイル群を GCS に直接アップロードする
4. backend が upload 完了後に `variants.source_root_uri` を確定する

この方式を採る理由:

- Cloud Run API を大容量ファイル転送のボトルネックにしない
- 大きいコードベースでも扱いやすい
- upload と graph build を分離できる

### Step 2. 配下ツリーの取得

backend が配下のディレクトリ / ファイル一覧を返す。

ここではまだ graph 化しない。

返す情報の例:

- path
- kind (`file` / `directory`)
- language
- size

### Step 3. ツリー UI で選択

ユーザーは以下を行う。

- ディレクトリ単位で選択
- 個別ファイル単位で選択
- 不要なファイルを除外

### Step 4. 選択結果を確定

選択されたファイル群だけを設計案に含める。

この時点で backend は:

- GCS 上のアップロード済みファイル群を code 実体として確定
- `variants.source_root_uri` を作成 / 更新
- `graph_build_jobs` を作成

### Step 5. graph 生成

worker が選択済みファイル群だけを対象に解析する。

結果として:

- `variant_files`
- `nodes`
- `edges`

が作られる。

必要ならその後に初期配置のための `layout_job` を 1 回実行する。

---

## import 前の選択と import 後の表示制御は別

ここは重要。

### import 前の選択

「この設計案に何のファイルを含めるか」を決める。

これは構造解析・AI レビューの対象範囲を決める。

### import 後の表示制御

「含めたファイルのうち、今は何を見やすくするか」を決める。

これは UI 表示だけの問題。

この違いにより、`variant_files.is_visible` は AI レビュー対象の判定に使わない。

---

## variant_files の役割

詳細は [VariantFiles](./tables/13_variant_files.md) を参照。

要点:

- import 時に、選択されたファイルだけ `variant_files` に登録する
- `variant_files` はその設計案に存在するファイル一覧の正本
- `nodes` は `variant_file_id` で所属ファイルを参照する
- `is_visible` は UI 表示制御用

つまり、

- import 対象に含めるか
- 画面に見せるか

は別概念である。

---

## 削除の扱い

このプロダクトでは、ファイルを設計案から外したい場合は物理削除でよい。

方針:

- 非表示: UI 上だけ見えなくする
- 削除: その設計案から完全に外す

つまり、AI レビューからも外したい場合は「削除」で扱う。

これにより、全体レビュー対象はシンプルに

- `variant_files` に存在するファイル全体

で定義できる。

---

## AI レビューとの接続

詳細は [Vertex AI レビュー実行フロー](./vertex-ai-review-flow.md) を参照。

重要な点:

- 全体レビューは `variant_files` に存在するファイルを母集団にする
- `is_visible` はレビュー対象判定に使わない
- 巨大なケースでは、worker が `variant_files` から必要ファイルだけ選んで本文を読む

したがって import 時の選択は、そのまま AI の入力空間を決める。

---

## 画面として必要なもの

### 1. フォルダ選択ダイアログ

- ルートフォルダ選択

### 2. 配下ツリーのプレビュー画面

- directory / file 一覧
- チェックボックス
- 一括選択 / 一括除外
- 拡張子やディレクトリ単位で絞り込み

### 3. 取り込み確認

- 選択ファイル数
- 推定サイズ
- 主言語

### 4. import 実行

- `graph_build_job` を起動
- 完了後に workspace へ遷移

---

## backend の責務

### API

- upload session 作成
- 配下ツリー取得
- 選択結果の受け取り
- graph build job 作成

### worker

- 選択済みファイル群だけを対象に解析
- `variant_files` を作成
- `nodes`, `edges` を生成
- 必要なら初期表示用の `layout_job` を別で実行

---

## 将来的な拡張

### 1. import プリセット

- `node_modules` 除外
- `dist` 除外
- `testdata` 除外

### 2. smart recommendation

- graph 生成前に「このディレクトリは除外候補」と提案する

### 3. 取り込み後の再構成

- 一部ファイルを追加 import
- 一部ファイルを削除

ただし最初は不要。

---

## 結論

インポートは次の形が自然。

1. ルートフォルダを選ぶ
2. 配下ツリーを見て対象を選ぶ
3. 選んだファイル群だけを設計案に含める
4. その結果から `variant_files`, `nodes`, `edges` を生成する

この方式なら、巨大コードベースでも扱いやすく、AI レビュー対象も明確に制御できる。
