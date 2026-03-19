# ホワイトボード型コードエディタ：機能別 技術選定案（Google寄り・議論反映 v3）

このドキュメントは、これまでの議論（Angular前提 / Cloud SQL中心 / 共同編集はYjs / エクスポートは新規生成 / AIチェックは参照中心）を反映した最新版です。

---

## 前提（設計思想）

- **中核は「単一の共有ドキュメント」**  
  ホワイトボード（ノード/矢印/配置）もコード（ノード内テキスト）も、同じ状態を別UIで見せるだけ。
- 同時編集は **CRDT**（Yjs）で収束させる。  
  1文字単位の同期はYjsに任せ、**エクスポート用に細粒度ログは持たない**（必要なら高レベルイベントのみ）。
- **堅牢性優先の主DBは Cloud SQL（PostgreSQL）**。  
  Firebaseは **認証（Firebase Auth）** と、必要なら **プレゼンス（RTDB）** に限定。
- ホワイトボードは手書きではなく、**カード（ノード）＋PNG等アセットの自由配置**。  
  PNGは `kind:image` の **ノード扱い**で統一する。
- コード編集はIDE代替を狙わず、**複数行テキストで十分**（補完不要）。価値は「設計・参照・共有・可視化」。

---

## 1) リアルタイム共同編集（最重要）

### 推奨
**Yjs（CRDT） + WebSocket（Cloud Run） + 永続化（Storage中心）**

- Yjs：同時編集の競合をCRDTで吸収（収束）
- WebSocket（Cloud Run）：Yjs update を room 単位で中継
- 永続化：
    - スナップショット：Storage（GCS / Firebase Storage）に定期保存（例：30秒/手動保存/離脱時）
    - 必要ならYjs更新の塊もStorageへ（小規模ならDBに入れても良いが細粒度は避ける）

### Hocuspocusについて
- Hocuspocusは **Yjs同期サーバ（バックエンド）**で、基本は **Node/TypeScript実装**。  
  Goで「Hocuspocusそのもの」を書くというより、同期サーバはNodeに任せ、**解析/生成/AIはGo**が分担としてきれい。

### プレゼンス（オンライン表示）
- **Realtime Database（onDisconnect）**が扱いやすい  Firebase Realtime Database
  例：オンライン状態・カーソル・フォーカス中のノードなどの一時データ

---

## 2) データ基盤（堅牢性優先）

### 決定
- 認証：**Firebase Authentication**
- 主DB：**Cloud SQL（PostgreSQL）**
- 添付/成果物：**GCS / Firebase Storage**

### 役割分担
- Cloud SQL：users / projects / project_members / roles / exports / jobs / audit_logs / finding（AI指摘）など
- Storage：PNG、ボードスナップショット、エクスポートzip、インポートzip（必要なら）

> 「UserテーブルはFirebase側に置く？」→ **No**（基本はCloud SQL）。  
> Authの `uid` を Cloud SQL の users と紐付けるのが鉄板。

---

## 3) ホワイトボード（自由配置キャンバス：ノード＋PNG＋矢印）

### 推奨
**Konva（Canvas） + Angular連携（ng2-konva等）**

- ノード（カード）と画像（PNG）を自由配置
- 矢印がノードに刺さるUIは、**ポート（接続点）＋アンカー情報**をデータとして持つ

#### ノードモデル（例）
- `id`
- `kind`: `function | group | note | image | ...`
- `filePath`（関数ノードなど）`/` './cmd/server/main.go'
- `x,y,w,h,z`
- `tags/colors/layer`
- `codeText`（必要なら）

#### エッジモデル（例）
- `id`
- `fromNodeId`, `toNodeId`
- `fromAnchor`, `toAnchor`（left/right/top/bottom）
- `kind`: `call | import | db | api | ...`
- `style`: `solid | dashed` など

---

## 4) コード編集（ノード内）

### 決定（MVP）
**複数行テキスト（textarea相当）**

- 補完不要（VS Codeで十分）
- 必要なら後から CodeMirror 6（補完OFF）で“操作性だけ”を上げる

---

## 5) エクスポート（ホワイトボード → コード）

### 決定：新規作成（A）
**ボードIR → ファイル群生成 → gofmt/goimports → zip出力**

- 各ノードが `filePath` を持つ前提で、**その通りに配置して出力**
- `filePath` 未指定は `internal/_unplaced/` に隔離して出力

#### Go生成で使う技術（候補）
- 生成：`text/template`（最短） or `go/ast + go/printer`（堅牢）
- 整形：`go/format`（gofmt）
- import整理：`golang.org/x/tools/imports`（goimports）
- zip：`archive/zip`

> 差分方式（履歴適用）はやめて、新規生成に固定。  
> 1文字単位ログをエクスポート用途に使うと運用が重くなりがち。

---

## 6) インポート（コード → ホワイトボード）

### 推奨
**Go解析（go/packages + go/types）→ シンボル/参照抽出 → 初期配置**

- 入力：フォルダ or zip
- 除外：`.gitignore` / `node_modules` など
- ノード化：関数/メソッド（必要ならinterfaceを抽象ノード化）
- エッジ化：まずは `call` が主役（MVPとして十分）

### 初期表示：依存の木（ツリー）で見せる
- 依存グラフは多親・循環があるため、初回表示は **スパニングツリー**を作って「木」として表示
    - 木に採用：実線
    - 木に入らない参照：点線/薄色/折りたたみ
- レイアウト：
    - ツリー中心：`d3-hierarchy`
    - 将来DAGも：`ELK（elkjs）`

---

## 7) 添付（PNG等）

### 推奨
**Storage（実体） + Cloud SQL（メタ）**

- Storage：PNGバイナリ
- Cloud SQL：`assets` テーブルでメタ（owner/project/path/size/etc）
- ボード上の画像ノードは `assetId` を参照

---

## 8) AIチェック（設計段階の口出し）＋AIフィードバック返信

### 8-0 目的（重要）
- **構文の正しさは重視しない**  
  大事なのは「どこに何の処理が置かれているか」という **意図**。
- よってAIは「実装の正否」より **配置・参照・責務の妥当性**をレビューする。

---

### 8-1 何を読み込ませるか（段階化で抜け漏れを防ぐ）

フォーカス機能があるから、フォーカス

#### レベル1（軽い：基本）
- 指示書（設計規約）
- ボードIR（ノード/エッジ/色/タグ/layer/filePath）
- 解析サマリ（call graph / imports / DB/API/IOフラグ）

→ ここで「怪しい参照（矢印）」や「責務混在の候補」を列挙できる。

#### レベル2（中：参照単位の確認）
怪しいと判定された **参照（A→B）** についてだけ、最小限のコードを追加：

- caller の callsite 周辺（±10行）
- callee の宣言ヘッダ（シグネチャ＋コメント）
- 必要なら、副作用行（DB/API/IO呼び出し行）の抜粋

→ 「その処理がそこにあるべきか？」の判断精度が上がる。

#### レベル3（重：例外）
それでも判断が難しいときだけ、対象ファイル全文などを追加投入。

> **全体フォルダ丸ごと投入**は、コンテキスト膨大で抜け漏れしやすいので原則避ける。  
> 代わりに「サーバ側で要約（サマリ/抜粋）を作って」渡す。

---

### 8-2 参照（矢印）を設計レビュー対象にする
- 各参照（caller→callee）に対して  
  **「この参照はその層/責務に置くべきか？」**だけを判定する。
- 判定の根拠は「layer/tags + 参照種別 + 副作用サマリ + 最小コード抜粋」。

#### 実用的なチェック例（MVP向け）
- 層違反：`handler → repo(DB)` 直参照は要注意（serviceを挟む等）
- 依存逆転：`domain → infra` はNG
- Pure混在：PureタグのノードがDB/API/IOを呼ぶのは要注意
- 循環：循環依存（SCC）の検出

---

### 8-3 出力フォーマット（Finding）を固定してUIに載せる
AIの返答は自由文ではなく、以下の構造化を基本にする：

- `severity`: info / warn / error
- `title`
- `summary`
- `evidence`: nodeId/edgeId/解析結果/抜粋
- `recommendations`: 箇条書き
- `target`: 該当ノード/矢印にジャンプ

---

### 8-4 AIフィードバック返信（指摘のスレッド化）
- Findingごとに「採用/却下/保留」＋コメントを残す
- 返信を踏まえてAIが「代替案」や「より具体的な改善」を返す
- Cloud SQLに `findings`, `finding_comments`, `finding_status` を保存

---

### 8-5 実装（Google寄り）
- モデル：**Vertex AI（Gemini）**
- 方式：Function/Tool呼び出しで「サマリ/抜粋」を必要時に取得
- RAG：規約（ADR/README等）を根拠にするなら後から導入

---

## 9) 参照俯瞰（大規模グラフ：任意）

- メインボード：Konvaで自由配置＋矢印編集
- 別ビュー：大量ノードの俯瞰や自動整列が必要なら **Cytoscape.js + ELK** を追加

---

# 現実的MVP（決定版）

- フロント：**Angular + TypeScript**
- メインボード：**Konva（Canvas）**（ノード/PNG自由配置＋矢印が刺さる）
- コード：**複数行テキスト（textarea）**
- 共同編集：**Yjs + WebSocket（Cloud Run）**
- プレゼンス：**Realtime Database（onDisconnect）**
- 主DB：**Cloud SQL（PostgreSQL）**
- 添付/成果物：**GCS / Firebase Storage**
- インポート解析：**Go（go/packages + go/types）**
- エクスポート：**新規生成（Go + gofmt/goimports + zip）**
- AIチェック：**段階化入力（参照中心） + Finding固定 + 返信スレッド（Cloud SQL）**
