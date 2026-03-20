# Nodes

グラフ上のノード（関数、メソッド、インターフェース等）を管理。各 node は `variant_files` にぶら下がり、どのファイルに属するかを `variant_file_id` で表す。

## テーブル定義

```sql
CREATE TABLE nodes (
  id SERIAL PRIMARY KEY,
  variant_id INTEGER NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
  variant_file_id INTEGER REFERENCES variant_files(id) ON DELETE SET NULL,
  kind VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
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
CREATE INDEX idx_nodes_variant_file_id ON nodes(variant_file_id);
CREATE INDEX idx_nodes_kind ON nodes(kind);
CREATE INDEX idx_nodes_title ON nodes(title);
```

## フィールド説明

| フィールド | 型 | 説明 |
|-----------|------|------|
| id | SERIAL | ノードID |
| variant_id | INTEGER | 所属バリエーションID (FK: variants) |
| variant_file_id | INTEGER | 所属ファイルID (FK: variant_files) |
| kind | VARCHAR(50) | ノード種別: `function`, `method`, `interface`, `group`, `note`, `image` |
| title | VARCHAR(255) | ノード名（関数名、クラス名など） |
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

## 設計メモ

- ファイルパスの正本は `variant_files.path`
- node は `variant_file_id` を通して所属ファイルを辿る
- AI review で node を参照するときは DB の `nodes.id` をそのまま使う
- `note`, `image`, `drawing` のようなファイル非依存ノードは `variant_file_id` を NULL にできる
