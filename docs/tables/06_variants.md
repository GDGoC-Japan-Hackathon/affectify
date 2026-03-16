# Variants

プロジェクトの設計バリエーションを管理。異なる設計パターン（DDD、Clean Architecture等）を試すために使用。

## テーブル定義

```sql
CREATE TABLE variants (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_main BOOLEAN DEFAULT FALSE,
  parent_variant_id INTEGER REFERENCES variants(id) ON DELETE SET NULL,
  design_guide_id INTEGER REFERENCES design_guides(id) ON DELETE SET NULL,
  analysis_score INTEGER,
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## インデックス

```sql
CREATE INDEX idx_variants_project_id ON variants(project_id);
CREATE INDEX idx_variants_parent_variant_id ON variants(parent_variant_id);
CREATE INDEX idx_variants_is_main ON variants(is_main);
```

## フィールド説明

| フィールド | 型 | 説明 |
|-----------|------|------|
| id | SERIAL | バリエーションID |
| project_id | INTEGER | プロジェクトID (FK: projects) |
| name | VARCHAR(255) | バリエーション名（例: "main", "ddd-implementation"） |
| description | TEXT | バリエーション説明 |
| is_main | BOOLEAN | メインバリエーションフラグ |
| parent_variant_id | INTEGER | 派生元バリエーションID (FK: variants, 自己参照) |
| design_guide_id | INTEGER | 適用されている設計書ID (FK: design_guides) |
| analysis_score | INTEGER | AI分析スコア（0-100） |
| created_by | INTEGER | 作成者 (FK: users) |
| created_at | TIMESTAMPTZ | 作成日時 |
| updated_at | TIMESTAMPTZ | 最終更新日時 |

## RLS ポリシー

バリエーションへのアクセスは親プロジェクトのアクセス権に準拠。

```sql
ALTER TABLE variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY variants_select_policy ON variants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = variants.project_id
        AND (
          p.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM project_members pm
            WHERE pm.project_id = p.id
              AND pm.user_id = auth.uid()
          )
        )
    )
  );
```

## 設計メモ

- アクセス制御は親プロジェクトの権限に従う
- 共有は `project_members` で管理し、`teams` や `project_shares` は使わない
