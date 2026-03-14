# Edges

ノード間の依存関係を管理。既存workspaceの BoardEdge に準拠。

## テーブル定義

```sql
CREATE TABLE edges (
  id SERIAL PRIMARY KEY,
  variant_id INTEGER NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
  from_node_id INTEGER NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  to_node_id INTEGER NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  kind VARCHAR(50) NOT NULL,
  style VARCHAR(20) NOT NULL DEFAULT 'solid',
  label TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(variant_id, from_node_id, to_node_id, kind)
);
```

## インデックス

```sql
CREATE INDEX idx_edges_variant_id ON edges(variant_id);
CREATE INDEX idx_edges_from_node_id ON edges(from_node_id);
CREATE INDEX idx_edges_to_node_id ON edges(to_node_id);
```

## フィールド説明

| フィールド | 型 | 説明 |
|-----------|------|------|
| id | SERIAL | エッジID |
| variant_id | INTEGER | 所属バリエーションID (FK: variants) |
| from_node_id | INTEGER | 依存元ノードID (FK: nodes) |
| to_node_id | INTEGER | 依存先ノードID (FK: nodes) |
| kind | VARCHAR(50) | エッジ種別: `call`, `import`, `implement` |
| style | VARCHAR(20) | 線のスタイル: `solid`, `dashed` |
| label | TEXT | エッジのラベル（オプション） |
| metadata | JSONB | メタデータ |
| created_at | TIMESTAMPTZ | 作成日時 |

## エッジ種別 (kind)

| kind | 説明 |
|------|------|
| call | 関数呼び出し |
| import | インポート関係 |
| implement | インターフェース実装 |
