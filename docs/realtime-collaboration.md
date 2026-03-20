# リアルタイム共同編集設計メモ

## 目的

WhiteCoder の `設計案` を複数ユーザーで同時に扱えるようにするための設計メモ。

このドキュメントでは、以下を整理する。

- どこまでをリアルタイムにするか
- 既存のテーブル設計とどう接続するか
- どの順番で実装すべきか

---

## 前提

現在の主語は `variant`（設計案）である。

1つの variant は少なくとも以下を持つ。

- コード実体: `variants.source_root_uri`
- ファイル一覧と表示状態: `variant_files`
- 設計書作業コピー: `variant_design_guides`
- graph: `nodes`, `edges`
- AI review 状態: `review_jobs`, `review_feedbacks`, `review_feedback_chats`

したがって、リアルタイム共同編集のルーム単位も `variant` に揃えるのが自然である。

---

## リアルタイムにしたい対象

### 1. まず同期したいもの

- 誰がその variant を開いているか
- 設計書の保存結果
- コードの保存結果
- node の位置変更
- ファイルの表示 / 非表示
- AI review カードの解決状態
- カードごとのチャット追加

### 2. 後で検討するもの

- 設計書本文の文字単位共同編集
- コード本文の文字単位共同編集
- 複数人の同時カーソル編集

---

## 基本方針

リアルタイム共同編集は2層に分けて考える。

### A. 永続状態

DB に保存される正本。

対象:

- `variant_design_guides.content`
- `variant_files.is_visible`
- `nodes.position_x`, `nodes.position_y`
- `review_feedbacks.status`, `review_feedbacks.resolution`
- `review_feedback_chats`

### B. 一時状態

保存しなくてよい、その瞬間だけ必要な状態。

対象:

- 誰が見ているか
- 選択中のファイル
- 選択中のカード
- カーソル位置
- viewport のズーム / スクロール位置
- 入力中だが未保存のテキスト

---

## 本命アーキテクチャ

### 永続化

- frontend
- backend API
- Cloud SQL

### リアルタイム配信

- frontend
- backend realtime gateway
- WebSocket または SSE

### 重い処理

- backend worker / Cloud Run Job

---

## variant ルームモデル

リアルタイム通信は `variant_id` 単位のルームに分ける。

例:

- `variant:123`

このルームで扱うイベント例:

- `presence.joined`
- `presence.left`
- `variant.design_guide.updated`
- `variant.source.updated`
- `variant.file_visibility.updated`
- `variant.node_positions.updated`
- `review.feedback.updated`
- `review.chat.created`
- `import.completed`
- `review.completed`

---

## 推奨実装段階

## Phase 1: 疑似リアルタイム

最初は polling / refetch で十分。

やること:

- 更新 API 実行後に再取得
- graph_build_job / layout_job / review_job は polling
- 画面の主データは都度取り直す

狙い:

- データモデルを固める
- 保存単位を明確にする

## Phase 2: 保存イベントのリアルタイム反映

WebSocket か SSE を導入して、保存完了イベントだけ他クライアントへ流す。

やること:

- variant ルーム参加
- 誰かの保存後にイベントを配信
- 他クライアントが該当データを refetch

この段階で十分リアルタイムらしく見える。

同期対象:

- 設計書更新
- コード更新
- node 位置保存
- ファイル表示切替
- review カード解決
- chat 投稿

## Phase 3: presence

誰が見ているか、どこを見ているかを出す。

追加要素:

- アクティブユーザー一覧
- 現在見ているファイル
- 選択中カード
- 閲覧中インジケータ

この段階では DB 保存不要。

## Phase 4: 文字単位共同編集

ここで初めて CRDT / OT を検討する。

対象:

- 設計書本文
- コード本文

注意:

- これは Phase 1-3 より難易度が一段高い
- DB だけでは解決しない
- 専用の同期アルゴリズムが必要

---

## 最初に採るべき同期戦略

最初は `イベント通知 + 再取得` がよい。

つまり、

1. 誰かが更新 API を叩く
2. backend が DB 保存
3. backend が realtime event を配信
4. 他クライアントが対象データを再取得

この方式の利点:

- 実装が軽い
- 整合性が単純
- DB が常に正本
- 複雑な競合解決が不要

---

## 競合解決の方針

文字単位共同編集に行く前は、基本的に保存単位ごとの競合でよい。

### 推奨ルール

- 設計書保存: 最後の保存を正とする
- node 位置保存: 最後の保存を正とする
- ファイル表示状態: 最後の保存を正とする
- review カードの解決状態: 操作履歴を残しつつ現在状態を上書き

### 補助策

- `updated_at` による楽観ロック
- 競合時の再読込メッセージ表示

---

## 将来追加してよいテーブル

リアルタイム機能を強める場合、以下のようなテーブルを追加できる。

### variant_presence_logs

監査や分析用。必須ではない。

例:

- `variant_id`
- `user_id`
- `joined_at`
- `left_at`

### variant_edit_sessions

設計書編集やコード編集のセッション管理を残したい場合に追加。

ただし最初は不要。

---

## 今のテーブル設計との接続点

リアルタイム対象と正本テーブルの対応:

- コード更新
  - `variants`
- ファイル表示切替
  - `variant_files`
- 設計書更新
  - `variant_design_guides`
- graph 更新
  - `nodes`, `edges`
- AI review カード状態
  - `review_feedbacks`
- AI review チャット
  - `review_feedback_chats`

ジョブ完了イベントの元:

- `graph_build_jobs`
- `layout_jobs`
- `review_jobs`

---

## 結論

リアルタイム共同編集は今の設計の延長線上で十分実現可能。

ただし最初から文字単位共同編集を狙うのではなく、次の順番がよい。

1. DB 正本の保存単位を固める
2. job + polling を成立させる
3. 保存イベントの realtime 配信を入れる
4. presence を追加する
5. 必要になったら CRDT / OT に進む

この順なら、設計案中心のプロダクト体験を壊さずに、段階的に強化できる。
