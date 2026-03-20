# VariantFiles

variant に含まれるファイル一覧を管理。ファイルツリー表示、ファイルごとの表示/非表示切り替え、各 node の所属ファイルの正本になる。

## テーブル定義

```sql
CREATE TABLE variant_files (
  id SERIAL PRIMARY KEY,
  variant_id INTEGER NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  language VARCHAR(50),
  node_count INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(variant_id, path)
);
```

## インデックス

```sql
CREATE INDEX idx_variant_files_variant_id ON variant_files(variant_id);
CREATE INDEX idx_variant_files_is_visible ON variant_files(is_visible);
CREATE INDEX idx_variant_files_language ON variant_files(language);
```

## フィールド説明

| フィールド | 型 | 説明 |
|-----------|------|------|
| id | SERIAL | ファイルID |
| variant_id | INTEGER | 対象 variant ID (FK: variants) |
| path | TEXT | variant 内でのファイルパス |
| language | VARCHAR(50) | 言語種別（例: `go`, `typescript`） |
| node_count | INTEGER | そのファイルに属する node 数 |
| is_visible | BOOLEAN | workspace 上で表示対象にするか |
| display_order | INTEGER | ファイルツリー表示順 |
| created_at | TIMESTAMPTZ | 作成日時 |
| updated_at | TIMESTAMPTZ | 最終更新日時 |

## 設計メモ

- 巨大なコードベースをファイル単位で間引くための正本
- file tree UI のチェック状態はこのテーブルに保存する
- `nodes` は `variant_file_id` を通じて所属ファイルを参照する
- コード本文は `variants.source_root_uri` と `variant_files.path` を組み合わせて読む
