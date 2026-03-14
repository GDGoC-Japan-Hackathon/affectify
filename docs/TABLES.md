# CodeDesign データベース設計

## 📋 概要

このドキュメントは、CodeDesign AI設計支援ツールのデータベーススキーマ設計を定義します。
PostgreSQL（Supabase）を想定した設計となっています。

---

## 🎯 設計方針

1. **個人所有+複数チーム共有モデル**
    - プロジェクトは個人が所有
    - 複数のチームと共有可能
    - 全体公開機能なし（設計書のみ公開可能）

2. **権限管理なし**
    - ユーザーの役割（Owner/Admin/Member）は存在しない
    - チームメンバーは全員平等

3. **設計バリエーションの管理**
    - プロジェクトは複数の設計バリエーション（Variants）を持つ
    - 各バリエーションは独立したノード配置とAI分析結果を持つ
    - メインバリエーション（main_variant）から派生バリエーションを作成可能
    - 異なる設計パターン（DDD、Clean Architecture等）を試せる

4. **リアルタイム同期対応**
    - Supabaseのリアルタイム機能を活用
    - 共同編集を見据えた設計

---

## 📊 テーブル設計

### 1. Users（ユーザー）

ユーザーアカウント情報を管理

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_users_email ON users(email);
```

**フィールド説明**
- `id`: ユーザーID（UUID）
- `email`: メールアドレス（一意）
- `name`: 表示名
- `avatar_url`: プロフィール画像URL
- `created_at`: アカウント作成日時
- `updated_at`: 最終更新日時
- `last_login_at`: 最終ログイン日時

---

### 2. Teams（チーム）

チーム情報を管理

```sql
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  avatar_url TEXT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_teams_created_by ON teams(created_by);
```

**フィールド説明**
- `id`: チームID
- `name`: チーム名
- `description`: チーム説明
- `avatar_url`: チームアイコンURL
- `created_by`: チーム作成者
- `created_at`: 作成日時
- `updated_at`: 最終更新日時

---

### 3. TeamMembers（チームメンバー）

チームとユーザーの多対多関係を管理

```sql
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
```

**フィールド説明**
- `id`: レコードID
- `team_id`: チームID
- `user_id`: ユーザーID
- `joined_at`: 参加日時

**注意**: 権限管理システムは削除されたため、`role`フィールドは存在しません。

---

### 4. Projects（プロジェクト）

プロジェクトのメタ情報を管理

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  thumbnail_url TEXT,
  starred BOOLEAN DEFAULT FALSE,
  tags TEXT[], -- PostgreSQL配列型
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_opened_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_projects_owner_id ON projects(owner_id);
CREATE INDEX idx_projects_starred ON projects(starred);
CREATE INDEX idx_projects_tags ON projects USING GIN(tags);
CREATE INDEX idx_projects_updated_at ON projects(updated_at DESC);
```

**フィールド説明**
- `id`: プロジェクトID
- `name`: プロジェクト名
- `description`: プロジェクト説明
- `owner_id`: プロジェクト所有者（個人所有モデル）
- `thumbnail_url`: サムネイル画像URL
- `starred`: スター（お気に入り）フラグ
- `tags`: タグ配列（技術スタック、分類など）
- `created_at`: 作成日時
- `updated_at`: 最終更新日時
- `last_opened_at`: 最後に開いた日時

---

### 5. ProjectShares（プロジェクト共有）

プロジェクトとチームの共有関係を管理

```sql
CREATE TABLE project_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shared_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, team_id)
);

CREATE INDEX idx_project_shares_project_id ON project_shares(project_id);
CREATE INDEX idx_project_shares_team_id ON project_shares(team_id);
```

**フィールド説明**
- `id`: レコードID
- `project_id`: プロジェクトID
- `team_id`: 共有先チームID
- `shared_by`: 共有実行者
- `shared_at`: 共有日時

**アクセス制御**
- プロジェクトオーナー（`projects.owner_id`）は常にアクセス可能
- 共有されたチーム（`project_shares.team_id`）のメンバーはアクセス可能

---

### 6. Variants（設計バリエーション）

プロジェクトの設計バリエーション（Variants）を管理

```sql
CREATE TABLE variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_main BOOLEAN DEFAULT FALSE,
  parent_variant_id UUID REFERENCES variants(id) ON DELETE SET NULL,
  design_guide_id UUID REFERENCES design_guides(id) ON DELETE SET NULL,
  analysis_score INTEGER,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_variants_project_id ON variants(project_id);
CREATE INDEX idx_variants_parent_variant_id ON variants(parent_variant_id);
CREATE INDEX idx_variants_is_main ON variants(is_main);
```

**フィールド説明**
- `id`: バリエーションID
- `project_id`: プロジェクトID
- `name`: バリエーション名（例: "main", "refactor-auth", "ddd-implementation"）
- `description`: バリエーション説明
- `is_main`: メインバリエーションフラグ
- `parent_variant_id`: 派生元バリエーションID（派生の場合）
- `design_guide_id`: 適用されている設計書ID
- `analysis_score`: AI分析スコア（0-100）
- `created_by`: 作成者
- `created_at`: 作成日時
- `updated_at`: 最終更新日時

---

### 7. Nodes（ノード）

グラフ上のノード（関数、クラス、コンポーネント、アセット）を管理

```sql
CREATE TABLE nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  variant_id UUID NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'function', 'component', 'class', 'asset'
  name VARCHAR(255) NOT NULL,
  file_path TEXT,
  code TEXT,
  position_x FLOAT NOT NULL DEFAULT 0,
  position_y FLOAT NOT NULL DEFAULT 0,
  width FLOAT,
  height FLOAT,
  metadata JSONB, -- 追加情報（パラメータ、戻り値型など）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_nodes_variant_id ON nodes(variant_id);
CREATE INDEX idx_nodes_type ON nodes(type);
CREATE INDEX idx_nodes_name ON nodes(name);
```

**フィールド説明**
- `id`: ノードID
- `variant_id`: 所属バリエーションID
- `type`: ノード種別（`function`, `component`, `class`, `asset`）
- `name`: ノード名（関数名、クラス名など）
- `file_path`: ファイルパス
- `code`: ソースコード
- `position_x`: X座標（キャンバス上の位置）
- `position_y`: Y座標（キャンバス上の位置）
- `width`: ノード幅
- `height`: ノード高さ
- `metadata`: メタデータ（JSONB形式）
    - 例: `{ "params": ["userId", "options"], "returnType": "Promise<User>", "complexity": 15 }`
- `created_at`: 作成日時
- `updated_at`: 最終更新日時

---

### 8. Edges（エッジ）

ノード間の依存関係を管理

```sql
CREATE TABLE edges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  variant_id UUID NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
  source_node_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  target_node_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'import', 'call', 'extends', 'implements'
  label TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(variant_id, source_node_id, target_node_id, type)
);

CREATE INDEX idx_edges_variant_id ON edges(variant_id);
CREATE INDEX idx_edges_source_node_id ON edges(source_node_id);
CREATE INDEX idx_edges_target_node_id ON edges(target_node_id);
```

**フィールド説明**
- `id`: エッジID
- `variant_id`: 所属バリエーションID
- `source_node_id`: 依存元ノードID
- `target_node_id`: 依存先ノードID
- `type`: エッジ種別
    - `import`: インポート関係
    - `call`: 関数呼び出し
    - `extends`: クラス継承
    - `implements`: インターフェース実装
- `label`: エッジのラベル（オプション）
- `metadata`: メタデータ（JSONB形式）
- `created_at`: 作成日時

---

### 9. DesignGuides（設計書）

設計パターン・アーキテクチャ指針のドキュメント

```sql
CREATE TABLE design_guides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  visibility VARCHAR(20) NOT NULL CHECK (visibility IN ('private', 'team', 'public')),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_design_guides_created_by ON design_guides(created_by);
CREATE INDEX idx_design_guides_team_id ON design_guides(team_id);
CREATE INDEX idx_design_guides_visibility ON design_guides(visibility);
CREATE INDEX idx_design_guides_tags ON design_guides USING GIN(tags);
```

**フィールド説明**
- `id`: 設計書ID
- `name`: 設計書名
- `description`: 説明
- `content`: マークダウン形式の設計書本文
- `visibility`: 公開範囲（private/team/public）
- `created_by`: 作成者
- `team_id`: チームID（team visibilityの場合）
- `tags`: タグ（検索用）
- `created_at`: 作成日時
- `updated_at`: 最終更新日時

---

### 10. DesignGuideLikes（設計書いいね）

設計書のいいね機能を管理

```sql
CREATE TABLE design_guide_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  design_guide_id UUID NOT NULL REFERENCES design_guides(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(design_guide_id, user_id)
);

CREATE INDEX idx_design_guide_likes_design_guide_id ON design_guide_likes(design_guide_id);
CREATE INDEX idx_design_guide_likes_user_id ON design_guide_likes(user_id);
```

---

### 11. AnalysisReports（AI分析レポート）

バリエーションごとのAI分析結果を管理

```sql
CREATE TABLE analysis_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  variant_id UUID NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
  overall_score INTEGER NOT NULL, -- 0-100
  summary TEXT,
  architecture_pattern VARCHAR(255),
  strengths TEXT[],
  weaknesses TEXT[],
  total_nodes INTEGER,
  total_edges INTEGER,
  cyclomatic_complexity_avg FLOAT,
  analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_analysis_reports_variant_id ON analysis_reports(variant_id);
CREATE INDEX idx_analysis_reports_overall_score ON analysis_reports(overall_score);
```

**フィールド説明**
- `id`: レポートID
- `variant_id`: 分析対象バリエーションID
- `overall_score`: 総合スコア（0-100）
- `summary`: 分析サマリー
- `architecture_pattern`: 検出されたアーキテクチャパターン
- `strengths`: 強み（配列）
- `weaknesses`: 弱点（配列）
- `total_nodes`: 総ノード数
- `total_edges`: 総エッジ数
- `cyclomatic_complexity_avg`: 平均循環的複雑度
- `analyzed_at`: 分析実行日時
- `created_at`: レコード作成日時

---

### 12. AnalysisIssues（分析問題）

AI分析で検出された問題点を管理

```sql
CREATE TABLE analysis_issues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID NOT NULL REFERENCES analysis_reports(id) ON DELETE CASCADE,
  severity VARCHAR(50) NOT NULL, -- 'high', 'medium', 'low'
  category VARCHAR(100) NOT NULL, -- 'coupling', 'circular-dependency', 'complexity', etc.
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  affected_nodes UUID[], -- 影響を受けるノードIDの配列
  recommendation TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_analysis_issues_report_id ON analysis_issues(report_id);
CREATE INDEX idx_analysis_issues_severity ON analysis_issues(severity);
CREATE INDEX idx_analysis_issues_category ON analysis_issues(category);
```

**フィールド説明**
- `id`: 問題ID
- `report_id`: 所属レポートID
- `severity`: 重要度（`high`, `medium`, `low`）
- `category`: カテゴリ
    - `coupling`: 高結合度
    - `circular-dependency`: 循環依存
    - `complexity`: 高複雑度
    - `isolated`: 孤立コンポーネント
    - `naming`: 命名規則違反
- `title`: 問題タイトル
- `description`: 問題詳細
- `affected_nodes`: 影響を受けるノードID配列
- `recommendation`: 推奨される対処法
- `created_at`: 検出日時

---

### 13. ActivityLogs（アクティビティログ）

ユーザーのアクション履歴を管理

```sql
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  action_type VARCHAR(100) NOT NULL, -- 'create_project', 'update_node', 'run_analysis', etc.
  action_description TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_project_id ON activity_logs(project_id);
CREATE INDEX idx_activity_logs_team_id ON activity_logs(team_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);
```

**フィールド説明**
- `id`: ログID
- `user_id`: アクション実行者
- `project_id`: 関連プロジェクトID
- `team_id`: 関連チームID
- `action_type`: アクション種別
    - `create_project`: プロジェクト作成
    - `update_project`: プロジェクト更新
    - `create_variant`: バリエーション作成
    - `update_node`: ノード更新
    - `create_edge`: エッジ作成
    - `run_analysis`: AI分析実行
    - `share_project`: プロジェクト共有
    - `fork_design_guide`: 設計書フォーク
- `action_description`: アクション説明（表示用）
- `metadata`: 追加情報（JSONB形式）
- `created_at`: アクション実行日時

---

### 14. Invitations（招待）

チーム招待の管理

```sql
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'declined', 'expired'
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_invitations_team_id ON invitations(team_id);
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_status ON invitations(status);
```

**フィールド説明**
- `id`: 招待ID
- `team_id`: 招待先チームID
- `email`: 招待されるメールアドレス
- `invited_by`: 招待実行者
- `status`: ステータス（`pending`, `accepted`, `declined`, `expired`）
- `token`: 招待トークン（一意）
- `expires_at`: 有効期限
- `created_at`: 招待作成日時
- `responded_at`: 応答日時

---

## 🔗 リレーションシップ図

```
users
  ├─ 1:N → projects (owner)
  ├─ N:M → teams (via team_members)
  ├─ 1:N → design_guides (owner)
  ├─ 1:N → activity_logs
  └─ N:M → design_guides (via design_guide_likes)

teams
  ├─ N:M → users (via team_members)
  ├─ N:M → projects (via project_shares)
  ├─ 1:N → design_guides (team visibility)
  └─ 1:N → invitations

projects
  ├─ 1:N → variants
  ├─ N:M → teams (via project_shares)
  └─ 1:N → activity_logs

variants
  ├─ 1:N → nodes
  ├─ 1:N → edges
  ├─ 1:N → analysis_reports
  └─ N:1 → design_guides

nodes
  ├─ 1:N → edges (as source)
  └─ 1:N → edges (as target)

analysis_reports
  └─ 1:N → analysis_issues

design_guides
  ├─ 1:N → variants (applied to)
  └─ N:M → users (via design_guide_likes)
```

---

## 🔒 Row Level Security (RLS) ポリシー

Supabaseを使用する場合、Row Level Security（RLS）ポリシーでアクセス制御を実装します。

### Users

```sql
-- ユーザーは自分の情報のみ更新可能
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_select_policy ON users
  FOR SELECT USING (true); -- 全ユーザーの基本情報は閲覧可能

CREATE POLICY users_update_policy ON users
  FOR UPDATE USING (auth.uid() = id);
```

### Projects

```sql
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- プロジェクトの閲覧: オーナーまたは共有チームのメンバー
CREATE POLICY projects_select_policy ON projects
  FOR SELECT USING (
    auth.uid() = owner_id
    OR EXISTS (
      SELECT 1 FROM project_shares ps
      JOIN team_members tm ON tm.team_id = ps.team_id
      WHERE ps.project_id = projects.id
        AND tm.user_id = auth.uid()
    )
  );

-- プロジェクトの作成: 認証済みユーザー
CREATE POLICY projects_insert_policy ON projects
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- プロジェクトの更新・削除: オーナーのみ
CREATE POLICY projects_update_policy ON projects
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY projects_delete_policy ON projects
  FOR DELETE USING (auth.uid() = owner_id);
```

### Variants, Nodes, Edges

```sql
-- バリエーションへのアクセスは親プロジェクトのアクセス権に準拠
ALTER TABLE variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY variants_select_policy ON variants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = variants.project_id
        AND (
          p.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM project_shares ps
            JOIN team_members tm ON tm.team_id = ps.team_id
            WHERE ps.project_id = p.id
              AND tm.user_id = auth.uid()
          )
        )
    )
  );

-- Nodes, Edgesも同様にバリエーションのアクセス権を継承
```

### DesignGuides

```sql
ALTER TABLE design_guides ENABLE ROW LEVEL SECURITY;

-- 設計書の閲覧: 公開、オーナー、またはチームメンバー
CREATE POLICY design_guides_select_policy ON design_guides
  FOR SELECT USING (
    visibility = 'public'
    OR owner_id = auth.uid()
    OR (
      visibility = 'team'
      AND EXISTS (
        SELECT 1 FROM team_members tm
        WHERE tm.team_id = design_guides.team_id
          AND tm.user_id = auth.uid()
      )
    )
  );

-- 設計書の作成・更新・削除: オーナーのみ
CREATE POLICY design_guides_insert_policy ON design_guides
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY design_guides_update_policy ON design_guides
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY design_guides_delete_policy ON design_guides
  FOR DELETE USING (auth.uid() = owner_id);
```

---

## 📈 インデックス戦略

パフォーマンス最適化のための主要インデックス:

1. **外部キー**: すべての外部キーにインデックス作成済み
2. **検索フィールド**: `tags`（GINインデックス）、`name`
3. **ソートフィールド**: `created_at`, `updated_at`, `like_count`
4. **フィルタフィールド**: `visibility`, `type`, `starred`, `is_main`

---

## 🔄 トリガーとストアドプロシージャ

### 更新日時の自動更新

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 各テーブルに適用
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 他のテーブルも同様...
```

### 設計書のカウンター更新

```sql
-- いいね数の計算はJOINで集計（リアルタイム計算）
-- またはマテリアライズドビューで最適化

-- 設計書の使用数を計算（variants テーブルから集計）
CREATE OR REPLACE VIEW design_guide_stats AS
SELECT
  dg.id,
  dg.name,
  dg.description,
  dg.visibility,
  dg.created_by,
  dg.tags,
  dg.created_at,
  dg.updated_at,
  COUNT(DISTINCT v.id) AS used_by_count,
  COUNT(DISTINCT dgl.user_id) AS like_count
FROM design_guides dg
LEFT JOIN variants v ON v.design_guide_id = dg.id
LEFT JOIN design_guide_likes dgl ON dgl.design_guide_id = dg.id
GROUP BY dg.id;
```

---

## 🚀 初期データ投入

### デフォルト設計書の作成

```sql
INSERT INTO design_guides (id, name, description, content, visibility, owner_id, tags)
VALUES
  (
    uuid_generate_v4(),
    'DDD設計ガイドライン',
    'ドメイン駆動設計の基本原則とベストプラクティス',
    '# DDD設計ガイドライン\n\n## 概要\n...',
    'public',
    'system-user-id', -- システムユーザーID
    ARRAY['DDD', 'アーキテクチャ', '設計パターン']
  ),
  (
    uuid_generate_v4(),
    'Clean Architecture規約',
    'Clean Architectureの実装ガイド',
    '# Clean Architecture規約\n\n## レイヤー構成\n...',
    'public',
    'system-user-id',
    ARRAY['Clean Architecture', 'レイヤードアーキテクチャ']
  );
```

---

## 📝 マイグレーション戦略

1. **初期セットアップ**: すべてのテーブル作成
2. **インデックス追加**: パフォーマンス測定後に最適化
3. **RLSポリシー**: セキュリティポリシーの適用
4. **トリガー設定**: 自動化処理の追加
5. **初期データ**: デフォルト設計書の投入

---

## 🔍 クエリ例

### ユーザーがアクセス可能なプロジェクト一覧

```sql
SELECT DISTINCT p.*
FROM projects p
LEFT JOIN project_shares ps ON ps.project_id = p.id
LEFT JOIN team_members tm ON tm.team_id = ps.team_id
WHERE p.owner_id = $1  -- ユーザーID
   OR tm.user_id = $1
ORDER BY p.updated_at DESC;
```

### チームのアクティビティ

```sql
SELECT
  al.*,
  u.name AS user_name,
  u.avatar_url AS user_avatar,
  p.name AS project_name
FROM activity_logs al
JOIN users u ON u.id = al.user_id
LEFT JOIN projects p ON p.id = al.project_id
WHERE al.team_id = $1  -- チームID
ORDER BY al.created_at DESC
LIMIT 20;
```

### バリエーションの依存関係グラフ取得

```sql
SELECT
  n.id,
  n.type,
  n.name,
  n.position_x,
  n.position_y,
  n.code,
  json_agg(
    json_build_object(
      'id', e.id,
      'source', e.source_node_id,
      'target', e.target_node_id,
      'type', e.type
    )
  ) FILTER (WHERE e.id IS NOT NULL) AS edges
FROM nodes n
LEFT JOIN edges e ON e.source_node_id = n.id
WHERE n.variant_id = $1  -- バリエーションID
GROUP BY n.id;
```

### 人気の設計書ランキング

```sql
SELECT
  dg.*,
  u.name AS owner_name,
  u.avatar_url AS owner_avatar,
  COUNT(DISTINCT v.id) AS used_by_count,
  COUNT(DISTINCT dgl.user_id) AS like_count
FROM design_guides dg
JOIN users u ON u.id = dg.created_by
LEFT JOIN variants v ON v.design_guide_id = dg.id
LEFT JOIN design_guide_likes dgl ON dgl.design_guide_id = dg.id
WHERE dg.visibility = 'public'
GROUP BY dg.id, u.id
ORDER BY like_count DESC, used_by_count DESC
LIMIT 10;
```

---

## 🎯 パフォーマンス最適化

1. **N+1問題の回避**: JOINやサブクエリで一括取得
2. **ページネーション**: LIMIT/OFFSETまたはカーソルベース
3. **JSONB活用**: 柔軟なメタデータ保存（適切にインデックス化）
4. **パーティショニング**: `activity_logs`は日付でパーティション化を検討
5. **マテリアライズドビュー**: 複雑な集計クエリはキャッシュ化

---

## 🔐 セキュリティ考慮事項

1. **RLS有効化**: すべてのテーブルでRow Level Securityを有効化
2. **認証必須**: `auth.uid()`による認証ユーザーの確認
3. **所有権チェック**: リソースの所有者またはチームメンバーのみアクセス可能
4. **入力検証**: アプリケーションレイヤーでバリデーション
5. **レート制限**: Supabaseのレート制限機能を活用

---

このデータベース設計により、CodeDesignの全機能を効率的にサポートし、スケーラブルで安全なデータ管理が可能になります。