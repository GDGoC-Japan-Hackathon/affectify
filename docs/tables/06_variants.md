# Variants

プロジェクト内の設計案の作業コピーを管理。1つの variant が「現在のコード」「現在の適用設計書」「現在の graph」「現在のレビュー対象」を持つ主語になる。

## テーブル定義

```sql
CREATE TABLE variants (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_main BOOLEAN DEFAULT FALSE,
  forked_from_variant_id INTEGER REFERENCES variants(id) ON DELETE SET NULL,
  analysis_score INTEGER,
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  source_language VARCHAR(50),
  source_root_uri TEXT,
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_imported_at TIMESTAMPTZ,
  last_reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## インデックス

```sql
CREATE INDEX idx_variants_project_id ON variants(project_id);
CREATE INDEX idx_variants_forked_from_variant_id ON variants(forked_from_variant_id);
CREATE INDEX idx_variants_is_main ON variants(is_main);
CREATE INDEX idx_variants_status ON variants(status);
```

## フィールド説明

| フィールド | 型 | 説明 |
|-----------|------|------|
| id | SERIAL | バリエーションID |
| project_id | INTEGER | プロジェクトID (FK: projects) |
| name | VARCHAR(255) | バリエーション名（例: "main", "ddd-implementation"） |
| description | TEXT | バリエーション説明 |
| is_main | BOOLEAN | メインバリエーションフラグ |
| forked_from_variant_id | INTEGER | 分岐元バリエーションID (FK: variants, 自己参照) |
| analysis_score | INTEGER | AI分析スコア（0-100） |
| status | VARCHAR(30) | 状態: `active`, `archived` |
| source_language | VARCHAR(50) | 主言語（例: `go`, `typescript`） |
| source_root_uri | TEXT | variant のコードルート保存先 (`gs://...`) |
| created_by | INTEGER | 作成者 (FK: users) |
| last_imported_at | TIMESTAMPTZ | 最後に graph を再生成した日時 |
| last_reviewed_at | TIMESTAMPTZ | 最後に AI review を実行した日時 |
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

- variant は「設計案の作業単位」
- コード実体の保存先は `variants.source_root_uri` に、適用中の設計書コピーは `variant_design_guides` に持つ
- 分岐時は親 variant のコードと設計書コピーを複製して新 variant を作る
- アクセス制御は親プロジェクトの権限に従う
