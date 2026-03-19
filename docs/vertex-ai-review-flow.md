# Vertex AI レビュー実行フロー

## 目的

WhiteCoder における AI レビューを、`variant`（設計案）を主語として Vertex AI 上でどう実行するかを整理する。

このドキュメントでは以下を扱う。

- 何を入力として Vertex AI に渡すか
- どういう単位で review job を実行するか
- 返ってきた結果をどう DB に保存するか
- 大規模コードベースに対してどう段階的にレビューするか

---

## 結論

AI レビューは `variant の現在状態` を入力として、`review_job` 単位で実行する。

入力の主な構成要素は以下。

- `variant_design_guides.content`
- `variant_files`
- `nodes`, `edges`
- 必要なコード本文
- 返却させたい JSON Schema

出力は Vertex AI の structured output を使って JSON で受け取り、以下へ保存する。

- 集約結果: `analysis_reports`
- カード本体: `review_feedbacks`
- 対象参照: `review_feedback_targets`
- チャット: `review_feedback_chats`

---

## 主語は variant

レビュー対象は `project` でも `design_guide` 単体でもなく、`variant` である。

理由:

- variant は 1 つの設計案の作業単位
- variant は現在のコードを持つ
- variant は現在の設計書を持つ
- variant は graph を持つ
- AI 全画面モーダルの対象も variant

したがって review 実行単位は `review_job(variant_id)` に揃える。

---

## review job の入力

### 必須入力

1. `variant_design_guides.content`

- 現在その設計案に適用されている設計書
- AI はこれをレビュー基準として使う

2. `variant_files`

- 対象ファイル一覧
- path
- language
- is_visible
- node_count

3. `nodes`, `edges`

- 既に import で生成された graph
- 構造の要約として利用

4. コード本文

- `variants.source_root_uri` から実ファイルを読む
- または worker が GCS 上のコード実体を展開して読む

### 補助入力

- variant 名
- project 名
- 過去の analysis summary
- review の重点観点

---

## Vertex AI に渡す形

基本は `generateContent` に対して以下を渡す。

- `systemInstruction`
- `contents`
- `responseMimeType = application/json`
- `responseSchema`

つまり、自然文でレビューさせるのではなく、最初から JSON 構造を返すように制約する。

---

## 推奨レスポンス形式

返却は少なくとも以下の形にする。

```json
{
  "overall_score": 72,
  "summary": "全体的にDDDの方向性は合っているが...",
  "design_guide_feedbacks": [
    {
      "id": "dg-1",
      "severity": "high",
      "title": "依存方向のルールが未定義",
      "description": "設計書に層間の依存方向が明記されていない",
      "suggestion": "domain層からinfrastructure層への依存を禁止するルールを追記してください"
    }
  ],
  "code_feedbacks": [
    {
      "id": "cf-1",
      "severity": "high",
      "title": "循環依存の検出",
      "description": "domain/user.go が infrastructure 層に直接依存しています",
      "file_paths": ["domain/user.go", "infrastructure/user_repo.go"],
      "node_ids": [12, 44],
      "edge_ids": [8],
      "suggestion": "Repositoryインターフェースを経由してください"
    }
  ]
}
```

これは `docs/ai-review.md` の方向性と一致している。

---

## 保存先

Vertex AI の返却 JSON はそのまま UI に渡すのではなく、DB に分解保存する。

### 1. analysis_reports

- review_job 単位の集約結果
- `overall_score`
- `summary`
- 元 JSON 全体

### 2. review_feedbacks

- カード単位のレコード
- `feedback_type`
- `severity`
- `title`
- `description`
- `suggestion`

### 3. review_feedback_targets

- ファイル / node / edge の関連対象
- `target_type = file | node | edge`
- `target_ref`

node / edge target の場合:

- review 生成前に DB へ反映済みの graph を前提とする
- AI に渡す参照は `nodes.id`, `edges.id` を使う
- `review_feedback_targets.target_ref` にはその ID を文字列化して保存してよい

### 4. review_feedback_chats

- カードごとの議論履歴

### 5. ai_recommendation

- 初回レビュー生成時に入ることがある
- カードごとの AI チャットで更新されることがある
- 保存先は `review_feedbacks.ai_recommendation`

---

## なぜ cards を分解保存するか

`analysis_reports.report_data` だけに閉じ込めると、AI 全画面モーダルの実装が弱くなる。

分解保存する理由:

- unresolved cards を一覧しやすい
- severity 順に並び替えやすい
- 解決状態を更新しやすい
- チャットをカード単位で持ちやすい
- node / edge highlight と結びつけやすい

---

## 推奨レビュー戦略

大規模コードベースでは、最初からすべてのコードを毎回丸投げしない。

### Phase 1: 粗いレビュー

入力:

- 設計書
- ファイル一覧
- graph 要約
- 代表的なコード断片

目的:

- 問題候補を広く抽出する
- どのファイルを深掘るべきか決める

### Phase 2: 深掘りレビュー

入力:

- Phase 1 で引っかかったファイルの本文
- 関連ノード / エッジ
- 該当設計ルール

目的:

- 精度の高い code feedback を作る

この 2 段階の方が、巨大な folder に対してコストと遅延を抑えやすい。

---

## 大きいコードベースへの対応

### 1. visible file は UI 用

`variant_files.is_visible` は UI 表示のための属性であり、全体レビュー対象の判定には使わない。

全体レビューの母集団は `variant_files` に存在するファイル全体とする。

### 2. graph で要約

コード全文を読む前に、まず `nodes`, `edges` で構造を要約する。

### 3. 関連ファイルだけ追加ロード

初回レスポンスで指摘対象候補が出たら、そのファイルだけ追加で読む。

### 4. context caching を活用

同じ設計書や大きな共通 prefix を繰り返し使うなら、Vertex AI の context caching を検討する。

---

## review job の実行フロー

1. frontend が `CreateReviewJob` を呼ぶ
2. backend-api が `review_jobs(status = queued)` を作る
3. worker が job を開始して `running` に更新
4. worker がその時点の `variant_design_guides`, `variant_files`, `nodes`, `edges`, コード本文を集める
5. worker が Vertex AI に structured output で問い合わせる
6. worker が結果 JSON を受け取る
7. worker が `analysis_reports`, `review_feedbacks`, `review_feedback_targets` に保存する
8. worker が `review_jobs` を `succeeded` に更新する
9. frontend は polling で完了を待ち、完了後に review state を再取得する

前提:

- analyzer は自前実装とする
- graph build の時点で DB へ `nodes`, `edges` を反映済みとする
- review では DB の `nodes.id`, `edges.id` を参照 ID として使う

## カードごとの AI チャットフロー

全体レビューとは別に、カード単位の AI チャットがある。

想定フロー:

1. frontend が `AppendReviewFeedbackChat(feedback_id, user_message)` を呼ぶ
2. backend-api がユーザー発話を `review_feedback_chats` に保存する
3. backend-api または worker が対象カードの局所コンテキストを組み立てる
4. Vertex AI に問い合わせる
5. AI 発話を `review_feedback_chats` に保存する
6. recommendation が返ってきた場合は `review_feedbacks.ai_recommendation` を更新する

カードチャットの入力:

- 対象 `review_feedbacks`
- 対象 `review_feedback_targets`
- 対象 `review_feedback_chats`
- 現在の `variant_design_guides.content`
- 関連コード本文

---

## 推奨 prompt 構成

### system instruction

役割と評価基準を固定する。

例:

- あなたは設計レビュー専門のアーキテクトである
- 設計書を基準にコードの違反点を検出する
- 必ず JSON Schema に従って返す
- 根拠のない断定を避ける

### user content

以下をまとめて渡す。

- 設計書本文
- 対象ファイル一覧
- graph 要約
- コード本文
- 期待する出力フォーマットの説明

---

## Vertex AI を使うときの実務上のポイント

### 1. structured output を使う

自然文だけにすると downstream が不安定になる。

### 2. 返却 JSON を必ず検証する

- schema validation
- 必須項目チェック
- severity / type の enum チェック

### 3. 失敗をジョブとして扱う

AI 呼び出し失敗は `review_jobs.failed` にして再試行可能にする。

### 4. トークン量を管理する

大きいコードベースでは file selection 戦略が必要。

---

## WhiteCoder における現実的な最初の実装

最初は以下で十分。

1. 設計書
2. ファイル一覧
3. graph 要約
4. 主要ファイル本文

を 1 回で Vertex AI に渡し、

- `overall_score`
- `summary`
- `design_guide_feedbacks`
- `code_feedbacks`

を JSON で受け取る。

その後、必要なら 2 段階レビューへ拡張する。

---

## 結論

WhiteCoder の AI レビューは、`variant の現在状態` を `review_job` 単位で Vertex AI に渡す形が自然である。

実装の核は以下。

- 主語は `variant`
- 入力は `設計書 + ファイル一覧 + graph + 必要コード`
- 出力は structured JSON
- 結果は `analysis_reports` と `review_feedbacks` 系へ分解保存
- 巨大コードベースは段階的レビューで扱う

この方針なら、今のテーブル設計と AI 全画面モーダルの両方に素直に接続できる。

## graph build / layout との関係

レビュー入力に使う `nodes`, `edges` は最新である必要がある。

そのため、コード変更後は以下の順で処理する。

1. `graph_build_job`
2. 必要なら `layout_job`
3. `review_job`

設計書だけ変わった場合は `review_job` だけでよい。
