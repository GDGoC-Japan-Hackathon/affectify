# Affectify データベース設計

PostgreSQL を想定したデータベーススキーマ設計。各テーブルの詳細は個別ファイルを参照。

## テーブル一覧
| # | テーブル | 説明 | 詳細 |
|---|---------|------|------|
| 1 | users | ユーザーアカウント | [01_users.md](tables/01_users.md) |
| 2 | teams | チーム | [02_teams.md](tables/02_teams.md) |
| 3 | team_members | チームメンバー（N:M） | [03_team_members.md](tables/03_team_members.md) |
| 4 | projects | プロジェクト | [04_projects.md](tables/04_projects.md) |
| 5 | project_shares | プロジェクト共有（N:M） | [05_project_shares.md](tables/05_project_shares.md) |
| 6 | variants | 設計バリエーション | [06_variants.md](tables/06_variants.md) |
| 7 | nodes | グラフノード | [07_nodes.md](tables/07_nodes.md) |
| 8 | edges | ノード間エッジ | [08_edges.md](tables/08_edges.md) |
| 9 | design_guides | 設計書 | [09_design_guides.md](tables/09_design_guides.md) |
| 10 | design_guide_likes | 設計書いいね（N:M） | [10_design_guide_likes.md](tables/10_design_guide_likes.md) |
| 11 | analysis_reports | AI分析レポート（JSONB） | [11_analysis_reports.md](tables/11_analysis_reports.md) |
| 12 | activity_logs | アクティビティログ | [12_activity_logs.md](tables/12_activity_logs.md) |

## 設計方針

1. **個人所有+チーム共有モデル** - プロジェクトは個人が所有し、複数のチームと共有可能
2. **権限管理なし** - チームメンバーは全員平等
3. **設計バリエーション** - プロジェクトは複数の variants を持ち、異なる設計パターンを試せる
4. **AI分析レポートはJSONB** - ネストの深いレポート構造を柔軟に格納

## リレーションシップ図

```
users
  ├── 1:N → projects (owner)
  ├── N:M → teams (via team_members)
  ├── 1:N → design_guides (creator)
  ├── 1:N → activity_logs
  └── N:M → design_guides (via design_guide_likes)

teams
  ├── N:M → users (via team_members)
  ├── N:M → projects (via project_shares)
  └── 1:N → design_guides (team visibility)

projects
  ├── 1:N → variants
  ├── N:M → teams (via project_shares)
  └── 1:N → activity_logs

variants
  ├── 1:N → nodes
  ├── 1:N → edges
  ├── 1:N → analysis_reports
  ├── N:1 → design_guides
  └── N:1 → variants (parent, 自己参照)

nodes
  ├── 1:N → edges (as from_node)
  └── 1:N → edges (as to_node)

design_guides
  ├── 1:N → variants (applied to)
  └── N:M → users (via design_guide_likes)
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

-- 適用対象: users, teams, projects, variants, nodes, design_guides
```
