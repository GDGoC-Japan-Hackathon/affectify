# ReviewFeedbackTargets

フィードバックカードが関連づけるファイル・ノード・エッジを管理。

## テーブル定義

```sql
CREATE TABLE review_feedback_targets (
  id SERIAL PRIMARY KEY,
  feedback_id INTEGER NOT NULL REFERENCES review_feedbacks(id) ON DELETE CASCADE,
  target_type VARCHAR(20) NOT NULL,
  target_ref TEXT NOT NULL
);
```

## インデックス

```sql
CREATE INDEX idx_review_feedback_targets_feedback_id ON review_feedback_targets(feedback_id);
CREATE INDEX idx_review_feedback_targets_target_type ON review_feedback_targets(target_type);
```

## フィールド説明

| フィールド | 型 | 説明 |
|-----------|------|------|
| id | SERIAL | レコードID |
| feedback_id | INTEGER | 対象フィードバックID (FK: review_feedbacks) |
| target_type | VARCHAR(20) | 種別: `file`, `node`, `edge` |
| target_ref | TEXT | 対象参照。file path / node id / edge id |

## 設計メモ

- workspace 上のハイライト対象を汎用的に表現する
- 将来 target metadata を増やしたくなったら JSONB を追加する
