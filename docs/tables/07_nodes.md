# Nodes

グラフ上のノード（関数、メソッド、インターフェース等）を管理。既存workspaceの BoardNode に準拠。

## テーブル定義

```sql
CREATE TABLE nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  variant_id UUID NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
  kind VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  file_path TEXT,
  signature TEXT,
  receiver TEXT,
  code_text TEXT,
  position_x FLOAT NOT NULL DEFAULT 0,
  position_y FLOAT NOT NULL DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## インデックス

```sql
CREATE INDEX idx_nodes_variant_id ON nodes(variant_id);
CREATE INDEX idx_nodes_kind ON nodes(kind);
CREATE INDEX idx_nodes_title ON nodes(title);
```

## フィールド説明

| フィールド | 型 | 説明 |
|-----------|------|------|
| id | UUID | ノードID |
| variant_id | UUID | 所属バリエーションID (FK: variants) |
| kind | VARCHAR(50) | ノード種別: `function`, `method`, `interface`, `group`, `note`, `image` |
| title | VARCHAR(255) | ノード名（関数名、クラス名など） |
| file_path | TEXT | ファイルパス |
| signature | TEXT | シグネチャ（関数の引数・戻り値の型情報） |
| receiver | TEXT | レシーバー（Go のメソッドレシーバーなど） |
| code_text | TEXT | ソースコード |
| position_x | FLOAT | X座標（キャンバス上の位置） |
| position_y | FLOAT | Y座標（キャンバス上の位置） |
| metadata | JSONB | 追加メタデータ |
| created_at | TIMESTAMPTZ | 作成日時 |
| updated_at | TIMESTAMPTZ | 最終更新日時 |

## ノード種別 (kind)

| kind | 説明 |
|------|------|
| function | 関数 |
| method | メソッド |
| interface | インターフェース |
| group | グループ（論理的なまとまり） |
| note | メモ・ノート |
| image | 画像アセット |
