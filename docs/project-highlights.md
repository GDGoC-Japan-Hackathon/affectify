# WhiteCoder 工夫点まとめ

## 1. 解決したかった課題

WhiteCoder は、設計書とコードの間にあるズレを見つけるだけでなく、そのズレを議論し、合意し、実際の変更に反映するところまで支援することを目的にしています。

その中でも特に重視したのが、設計書を AI と人間の共通言語として扱うことです。

設計書があることで、人間にとっては

- AI がなぜその修正を提案したのかを監視しやすい
- AI の反映内容が設計意図とズレていないか確認しやすい
- 自分の目で判断する際の基準を持ちやすい

という利点があります。

AI にとっても、

- 実装前提や責務分割を先に共有できる
- 無関係なコード全体を毎回深く読まなくてもよくなる
- 実装やレビューの方向づけがしやすくなる

ため、トークン消費の削減や判断の安定化にもつながります。

つまり設計書は、

- 人間にとっては AI を監視しやすくする材料
- AI にとっては実装しやすくするガイド

の両方を兼ねており、この共通言語を中心に据えたことが本プロジェクトの大きな前提になっています。

このため、本プロジェクトでは「レビュー生成」ではなく、

- コード構造の可視化
- AI による構造化レビュー
- ユーザーとの議論
- 決定内容の反映
- 再解析

までを一つのループとして成立させることを重視しました。

## 2. システム全体の考え方

本プロジェクトでは、正本を次のように分離しています。

- 設計書の正本: `variant_design_guides`
- コードの正本: `source_root_uri` 配下のソース
- 構造化結果: `variant_files`, `nodes`, `edges`
- レビュー結果: `review_feedbacks`, `analysis_reports`
- 反映ジョブ: `review_apply_jobs`

この分離によって、AI が直接 node を編集するのではなく、

1. ソースコードや設計書を更新する
2. `graph_build` で構造を再生成する
3. `layout` で再配置する

という、整合性の保ちやすい構成にしています。

## 3. システム構成

WhiteCoder の主要な構成要素は次の通りです。

- Frontend
  Next.js ベースの workspace UI。コード構造の可視化、レビューカード表示、AI チャット、設計書編集を担当します。
- Backend API
  認証、variant 管理、review 管理、job 作成、source 管理の中心です。
- Source Store
  ローカル開発では `file://`、本番では GCS を使い、variant ごとのソースコード正本を保持します。
- Graph Build Job
  `source_root_uri` から Go コードを解析し、`variant_files`, `nodes`, `edges` を再構築します。
- Layout Job
  再構築された node/edge をもとに座標を計算し、workspace 表示用のレイアウトを保存します。
- Review Job
  設計書と graph をもとに、`analysis_reports` と `review_feedbacks` を生成します。
- Review Apply Job
  解決済みカードの `resolution_note` をもとに、設計書とコードの更新を行います。
- Database
  project / variant / graph / review / job の状態を保持します。
- Vertex AI
  review 生成、チャット応答、resolution draft、apply 生成を担当します。

全体の流れは次のようになります。

1. ユーザーがコードを import する
2. source が Source Store に保存される
3. `graph_build_job` が `variant_files`, `nodes`, `edges` を生成する
4. `layout_job` が node の配置を決める
5. `review_job` が AI レビューを生成する
6. ユーザーがカードごとに議論し、`resolution` と `resolution_note` を確定する
7. `review_apply_job` が設計書とコードを更新する
8. 必要に応じて再び `graph_build -> layout -> review` を回す

図式化すると、概念的には次の構成です。

```text
Frontend
  -> Backend API
    -> Database
    -> Source Store (Local / GCS)
    -> Vertex AI
    -> Cloud Run Jobs
       - graph_build
       - layout
       - review
       - review_apply
```

## 4. 工夫したポイント

### 3.1 設計上の工夫

#### AI の提案とユーザーの決定を分離した

レビューカードでは、次の値を分けて持っています。

- `ai_recommendation`: AI が今おすすめしている対応方針
- `resolution`: ユーザーが最終的に採用した対応方針
- `resolution_note`: 実際にどう変えるかの具体的な決定内容
- `status`: `open / resolved / dismissed`

この分離により、

- AI は提案を更新し続ける
- 最終決定はユーザーが持つ
- 決定後の反映は `review_apply_job` が行う

という責務分離ができています。

#### レビュー対象の粒度を node / edge / file にした

`review_feedback_targets` は単純な文字列参照ではなく、

- `node_id`
- `edge_id`
- `file_path`

の 3 軸で持つようにしています。

これにより、

- UI の強調表示が単純になる
- AI が対象を具体的に認識しやすい
- 再反映時にどこを変えるべきかを絞りやすい

というメリットがあります。

#### AI の反映先を source に寄せた

AI が修正するのは `nodes` ではなく、`source_root_uri` 配下の実ソースです。

その後に

- `graph_build`
- `layout`

をやり直すことで、構造データは常にコードから再生成されます。

この設計により、構造データだけが不整合に更新される状態を避けています。

### 3.2 AI 活用上の工夫

#### AI を「指摘者」で終わらせず、「反映者」まで担わせた

本プロジェクトでは AI を以下の 3 段階で使っています。

1. `review_job`
   コード構造と設計書を見てレビューカードを生成する
2. `chat`
   個別カードについて議論し、対応方針を詰める
3. `review_apply_job`
   決定済みの `resolution_note` をもとに設計書・コードを更新する

単なるレビュー支援ではなく、設計変更の実行にまで踏み込んでいる点が特徴です。

#### function calling を read-only に限定した

AI が参照できる tool は、

- `list_files`
- `list_nodes`
- `list_edges`
- `get_feedback_targets`
- `get_node_context`
- `get_design_guide`

などの read-only tool に限定しています。

これにより、

- AI に DB の任意更新をさせない
- OS コマンド実行のような危険な権限を与えない
- 既に認可済みの variant の文脈だけを読ませる

という安全設計にしています。

#### prompt injection を考慮した system prompt を入れた

コードコメント、設計書、resolution note などに含まれる文は命令ではなくデータとして扱うように、review / chat / resolution draft / apply のすべてで上位指示を入れています。

これにより、コード中や設計書中に埋め込まれた不正な指示に AI が引っ張られにくい構成にしています。

### 3.3 UX 上の工夫

#### レビューから反映までのフローを分けた

最初は `ReGenerate` のような名前でまとめようとしていましたが、意味が曖昧になるため、次のように役割を分けました。

- `再レビュー`
  現在の状態から新しく review を作る
- `AIに決定内容を反映`
  `resolved` なカードの決定内容を実際に設計書やコードへ適用する

これにより、ユーザーにとって「今は再評価なのか、実際の更新なのか」が分かりやすくなっています。

#### apply 後に古い review を見せないようにした

`review_apply_job` が成功した review は、画面上ではリセットし、再読み込みしてもそのまま古い review を表示しないようにしています。

これにより、反映済みの指摘が UI に残り続ける混乱を避けています。

### 3.4 開発体験と運用の工夫

#### ローカル・dev・prod を分けて開発しやすくした

本プロジェクトでは、環境を次の 3 層で整理しています。

- ローカル開発環境
  手元で backend / frontend / DB を動かして、素早く試せる環境
- dev GCP 環境
  `develop` ブランチから自動デプロイされる検証環境
- prod GCP 環境
  `main` ブランチからデプロイされる本番環境

この構成により、

- まずローカルで素早く試す
- dev でクラウド上の挙動を確かめる
- 問題なければ prod に出す

という、実務で扱いやすい流れを作っています。

#### Terraform でクラウド構成を揃えた

Cloud Run、Cloud Run Jobs、Cloud SQL、GCS、Secret Manager、IAM などを Terraform で管理することで、

- 環境差分を見えやすくする
- dev と prod の再現性を高める
- GUI の手作業依存を減らす

ようにしています。

特に本プロジェクトでは、job の種類が多く、

- `graph_build`
- `layout`
- `review`
- `review_apply`

のように複数の非同期処理を持つため、Terraform 化の効果が大きいです。

#### DB 変更も安全に扱えるようにした

インフラだけでなく、DB スキーマ変更についても運用しやすさを意識しています。

また、本プロジェクトでは entity 定義を正本に寄せており、それを基準に DB 変更を扱えるようにしています。

- Atlas
  宣言的に schema 差分を扱う migration ツールとして利用
- genorm
  DB entity とコードの整合性を保ち、型安全に扱いやすくするために利用

これにより、

- migration が drift していないかを CI で確認しやすい
- 手書き SQL とアプリコードのズレを減らしやすい
- schema 変更時の安全性を高めやすい

という利点がありました。

特に Atlas を使うことで、

- 現在の desired schema と migration directory の差分を見やすい
- `atlas.sum` を含めて migration の整合性を保ちやすい
- CI 上で drift を検知しやすい

という点が、複数人開発でも有効でした。

entity を正本として扱えることで、

- アプリケーションコード
- ORM 的な扱い
- migration 管理

を比較的一貫した視点で扱えるようになり、schema 変更時の認知負荷を下げられた点も大きな利点でした。

#### proto を中心にした API 開発にした

Backend と frontend の通信には、proto をベースにした gRPC / Connect を採用しています。

これにより、

- API の入出力を schema で先に固定できる
- frontend / backend の型を揃えやすい
- request / response のズレを減らせる
- AI にとっても API 構造を追いやすい

という利点がありました。

特に本プロジェクトでは、

- `VariantService`
- `ReviewService`
- `NodeService`

のように責務ごとに API を整理しているため、proto を起点に設計することで、機能追加時にも見通しを保ちやすくなっています。

また、生成コードを利用することで、

- frontend で request schema を型安全に組み立てる
- backend で handler 実装を明確に分ける

ことができ、レビュー系や job 系のように API 数が増えても破綻しにくい構成になっています。

#### AI にとっても把握しやすい構成を意識した

インフラやデプロイがコード化されていることで、

- どの job がどこで動くか
- backend がどの Secret や bucket を参照するか
- dev / prod の差分が何か

を AI も追いやすくなっています。

その結果、

- GCP コンソールの GUI に強く依存せずに修正を進めやすい
- 問題の切り分けをコードベースで行いやすい

という利点がありました。

#### CI/CD で環境を守りやすくした

`develop` と `main` の役割を分けて、

- `develop`
  dev 環境への deploy
- `main`
  prod 環境への deploy

という運用にしています。

また、

- build
- migration
- terraform plan / apply
- image build / push

を workflow に載せることで、環境の破壊や設定漏れを防ぎやすくしています。

これは単に自動化したというだけでなく、

- develop 環境を壊しにくくする
- prod 反映を再現可能にする
- 手動 GUI 操作によるズレを減らす

という意味で、開発体験の改善にもつながっています。

## 5. 実装・運用面で苦労したポイント

### graph build の安定化

Go の構造解析では、

- module root と file path の基準ズレ
- generated file のノイズ
- Cloud Run Job の OOM

が問題になりました。

対策として、

- `go.mod` を基準に `module_root` を検出
- parser 側でも generated file を除外
- Cloud Run Job のメモリを引き上げる

ことで安定化しています。

また、Go 固有の難しさとして、interface や call edge の抽出が最初はうまく機能しませんでした。

具体的には、

- `typeutil.Callee(...)` だけでは callee が取れないケースが多かった
- interface を返り値に持つ呼び出しや selector の解決が弱く、`implement` / `call` edge が十分に張れなかった
- その結果、ノードは出るのに edge がほぼ 0 本になるケースがあった

という問題がありました。

対策として parser 側では、

- `packages.Load` 後に `pkg.Errors` をログ出力して、型情報の崩れを可視化する
- `typeutil.Callee(...)` が取れない場合に、`TypesInfo.ObjectOf / Uses` を使った fallback 解決を入れる
- interface 型については `types.Interface` を保持し、`types.Implements(...)` を使って `implement` edge を組み立てる
- selector の receiver が interface の場合は、その interface node を優先して解決する

ようにしています。

この改善によって、

- method と interface の関係
- call edge
- implement edge

が以前より安定して graph に出るようになりました。

## 6. 今後の改善余地

- `review_apply_job` 後のコードを zip / patch / PR として外部へ同期する仕組み
- ファイルツリーを node 由来ではなく `variant_files` 正本で描画する改善
- AI apply の変更差分プレビュー
- review / apply のより詳細な進捗表示
- 権限の bootstrap と CI/CD 権限をさらに最小化する見直し
- レビュー結果、`good / bad` リアクション、解決内容、apply 結果を分析し、どの提案が有効だったかを学習して AI のレビュー品質と反映精度を継続的に改善する仕組み
- 複数人で同じ workspace を同時に扱えるリアルタイム編集機能の強化

## 7. まとめ

WhiteCoder の工夫点は、AI を単なるレビュアーにせず、

- 構造理解
- 指摘
- 議論
- 決定
- 反映
- 再構築

までを一つのサイクルとして扱った点にあります。

特に、

- source を正本にして graph を再構築する設計
- AI の提案とユーザー決定の分離
- read-only function calling と prompt injection 対策
- GCS direct upload や Cloud Run Job を含む運用上の工夫

が、このプロジェクトの中核的な工夫と言えます。
