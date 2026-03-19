# ReviewFeedbackChats

フィードバックカードごとのチャット履歴を管理。

## テーブル定義

```sql
CREATE TABLE review_feedback_chats (
  id SERIAL PRIMARY KEY,
  feedback_id INTEGER NOT NULL REFERENCES review_feedbacks(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## インデックス

```sql
CREATE INDEX idx_review_feedback_chats_feedback_id ON review_feedback_chats(feedback_id);
CREATE INDEX idx_review_feedback_chats_created_at ON review_feedback_chats(created_at);
```

## フィールド説明

| フィールド | 型 | 説明 |
|-----------|------|------|
| id | SERIAL | レコードID |
| feedback_id | INTEGER | 対象フィードバックID (FK: review_feedbacks) |
| role | VARCHAR(20) | 発話者: `user`, `ai` |
| content | TEXT | 発話内容 |
| created_by | INTEGER | ユーザー発話時の発話者 (FK: users) |
| created_at | TIMESTAMPTZ | 発話日時 |

## 設計メモ

- AI 全画面モーダルの右チャットペインの正本
- `role = ai` の場合 `created_by` は NULL でよい
