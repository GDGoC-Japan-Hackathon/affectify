# ReviewFeedbackActions

フィードバックカードの確定・取り消しなどの操作履歴を管理。

## テーブル定義

```sql
CREATE TABLE review_feedback_actions (
  id SERIAL PRIMARY KEY,
  feedback_id INTEGER NOT NULL REFERENCES review_feedbacks(id) ON DELETE CASCADE,
  action_type VARCHAR(30) NOT NULL,
  resolution VARCHAR(30),
  acted_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## インデックス

```sql
CREATE INDEX idx_review_feedback_actions_feedback_id ON review_feedback_actions(feedback_id);
CREATE INDEX idx_review_feedback_actions_acted_by ON review_feedback_actions(acted_by);
CREATE INDEX idx_review_feedback_actions_created_at ON review_feedback_actions(created_at DESC);
```

## フィールド説明

| フィールド | 型 | 説明 |
|-----------|------|------|
| id | SERIAL | レコードID |
| feedback_id | INTEGER | 対象フィードバックID (FK: review_feedbacks) |
| action_type | VARCHAR(30) | 操作種別: `resolve`, `unresolve`, `dismiss` |
| resolution | VARCHAR(30) | 対応分類: `update_design_guide`, `fix_code`, `both` |
| acted_by | INTEGER | 操作者 (FK: users) |
| created_at | TIMESTAMPTZ | 操作日時 |

## 設計メモ

- カードの「箱に入れる」「取り消す」操作履歴を残す
- 現在状態は `review_feedbacks.status` / `review_feedbacks.resolution` を参照し、ここは監査ログとして使う
