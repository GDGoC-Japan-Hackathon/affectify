# WhiteCoder データベース設計

PostgreSQL を想定したデータベーススキーマ設計。各テーブルの詳細は個別ファイルを参照。

## テーブル一覧
| # | テーブル | 説明 | 詳細 |
|---|---------|------|------|
| 1 | users | ユーザーアカウント | [01_users.md](tables/01_users.md) |
| 2 | projects | プロジェクト | [04_projects.md](tables/04_projects.md) |
| 3 | project_members | プロジェクトメンバー（N:M） | [05_project_members.md](tables/05_project_members.md) |
| 4 | variants | 設計バリエーション | [06_variants.md](tables/06_variants.md) |
| 5 | nodes | グラフノード | [07_nodes.md](tables/07_nodes.md) |
| 6 | edges | ノード間エッジ | [08_edges.md](tables/08_edges.md) |
| 7 | design_guides | 設計書 | [09_design_guides.md](tables/09_design_guides.md) |
| 8 | design_guide_likes | 設計書いいね（N:M） | [10_design_guide_likes.md](tables/10_design_guide_likes.md) |
| 9 | analysis_reports | AI分析レポート（JSONB） | [11_analysis_reports.md](tables/11_analysis_reports.md) |
| 10 | activity_logs | アクティビティログ | [12_activity_logs.md](tables/12_activity_logs.md) |
| 11 | variant_files | variant ごとのファイル一覧と表示状態 | [13_variant_files.md](tables/13_variant_files.md) |
| 12 | variant_design_guides | variant ごとの設計書作業コピー | [14_variant_design_guides.md](tables/14_variant_design_guides.md) |
| 13 | graph_build_jobs | graph 生成・同期ジョブ | [15_graph_build_jobs.md](tables/15_graph_build_jobs.md) |
| 14 | layout_jobs | レイアウト計算ジョブ | [16_layout_jobs.md](tables/16_layout_jobs.md) |
| 15 | review_jobs | AI レビュージョブ | [17_review_jobs.md](tables/17_review_jobs.md) |
| 16 | review_feedbacks | AI レビューカード | [18_review_feedbacks.md](tables/18_review_feedbacks.md) |
| 17 | review_feedback_targets | カード関連対象 | [19_review_feedback_targets.md](tables/19_review_feedback_targets.md) |
| 18 | review_feedback_chats | カード別チャット履歴 | [20_review_feedback_chats.md](tables/20_review_feedback_chats.md) |
| 19 | review_feedback_actions | カード操作履歴 | [21_review_feedback_actions.md](tables/21_review_feedback_actions.md) |

## 設計方針

1. **project は共有の箱** - 所有者とメンバー権限を持つ
2. **variant は作業単位** - コード、設計書、graph、review の主語になる
3. **設計書は原本と作業コピーを分離** - ライブラリ原本は `design_guides`、variant 上の編集中実体は `variant_design_guides`
4. **AI review は履歴と現在状態を分離** - 集約レポートは `analysis_reports`、カードやチャットは review 系テーブル
5. **重い処理は job 化** - graph build / layout / review は非同期実行する

## リレーションシップ図

```
users
  ├── 1:N → projects (owner)
  ├── N:M → projects (via project_members)
  ├── 1:N → design_guides (creator)
  ├── 1:N → activity_logs
  └── N:M → design_guides (via design_guide_likes)

projects
  ├── 1:N → variants
  ├── N:M → users (via project_members)
  └── 1:N → activity_logs

variants
  ├── 1:N → variant_files
  ├── 1:1 → variant_design_guides
  ├── 1:N → nodes
  ├── 1:N → edges
  ├── 1:N → analysis_reports
  ├── 1:N → graph_build_jobs
  ├── 1:N → layout_jobs
  ├── 1:N → review_jobs
  └── N:1 → variants (forked_from, 自己参照)

variant_files
  └── 1:N → nodes

nodes
  ├── 1:N → edges (as from_node)
  └── 1:N → edges (as to_node)

design_guides
  ├── 1:N → variant_design_guides (as base)
  └── N:M → users (via design_guide_likes)

review_jobs
  ├── 1:N → review_feedbacks
  └── 1:1 → analysis_reports

review_feedbacks
  ├── 1:N → review_feedback_targets
  ├── 1:N → review_feedback_chats
  └── 1:N → review_feedback_actions
```

## トリガー

```sql
-- updated_at 自動更新
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 適用対象: users, projects, variants, nodes, design_guides, variant_design_guides
```
