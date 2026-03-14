# DesignGuideLikes

設計書のいいね機能を管理

## テーブル定義

```sql
CREATE TABLE design_guide_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  design_guide_id UUID NOT NULL REFERENCES design_guides(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(design_guide_id, user_id)
);
```

## インデックス

```sql
CREATE INDEX idx_design_guide_likes_design_guide_id ON design_guide_likes(design_guide_id);
CREATE INDEX idx_design_guide_likes_user_id ON design_guide_likes(user_id);
```

## フィールド説明

| フィールド | 型 | 説明 |
|-----------|------|------|
| id | UUID | レコードID |
| design_guide_id | UUID | 設計書ID (FK: design_guides) |
| user_id | UUID | ユーザーID (FK: users) |
| created_at | TIMESTAMPTZ | いいね日時 |
