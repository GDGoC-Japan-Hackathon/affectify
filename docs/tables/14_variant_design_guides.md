# VariantDesignGuides

variant に現在適用されている設計書の作業コピーを管理。ライブラリ上の `design_guides` 原本とは分離し、AI とユーザーが variant ごとに一緒に更新していくための実体を持つ。

## テーブル定義

```sql
CREATE TABLE variant_design_guides (
  id SERIAL PRIMARY KEY,
  variant_id INTEGER NOT NULL UNIQUE REFERENCES variants(id) ON DELETE CASCADE,
  base_design_guide_id INTEGER REFERENCES design_guides(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## インデックス

```sql
CREATE INDEX idx_variant_design_guides_base_design_guide_id ON variant_design_guides(base_design_guide_id);
CREATE INDEX idx_variant_design_guides_created_by ON variant_design_guides(created_by);
```

## フィールド説明

| フィールド | 型 | 説明 |
|-----------|------|------|
| id | SERIAL | レコードID |
| variant_id | INTEGER | 対象 variant ID (FK: variants) |
| base_design_guide_id | INTEGER | 複製元のライブラリ設計書ID (FK: design_guides) |
| title | VARCHAR(255) | variant 上の設計書名 |
| description | TEXT | 説明 |
| content | TEXT | Markdown 本文 |
| version | INTEGER | variant 内での更新版数 |
| created_by | INTEGER | 作成者 (FK: users) |
| created_at | TIMESTAMPTZ | 作成日時 |
| updated_at | TIMESTAMPTZ | 最終更新日時 |

## 設計メモ

- `design_guides` は原本ライブラリ、`variant_design_guides` は作業コピー
- AI review はこのテーブルの `content` を基準に行う
- 分岐時はこのレコードも複製して子 variant に持たせる
