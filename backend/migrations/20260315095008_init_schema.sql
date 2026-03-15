-- Create "activity_logs" table
CREATE TABLE "activity_logs" (
  "id" bigserial NOT NULL,
  "user_id" bigint NOT NULL,
  "project_id" bigint NULL,
  "team_id" bigint NULL,
  "action_type" character varying(100) NOT NULL,
  "action_description" text NULL,
  "metadata" jsonb NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
-- Create index "idx_activity_logs_project_id" to table: "activity_logs"
CREATE INDEX "idx_activity_logs_project_id" ON "activity_logs" ("project_id");
-- Create index "idx_activity_logs_team_id" to table: "activity_logs"
CREATE INDEX "idx_activity_logs_team_id" ON "activity_logs" ("team_id");
-- Create index "idx_activity_logs_user_id" to table: "activity_logs"
CREATE INDEX "idx_activity_logs_user_id" ON "activity_logs" ("user_id");
-- Create "analysis_reports" table
CREATE TABLE "analysis_reports" (
  "id" bigserial NOT NULL,
  "variant_id" bigint NOT NULL,
  "overall_score" integer NOT NULL,
  "report_data" jsonb NOT NULL,
  "analyzed_at" timestamptz NOT NULL DEFAULT now(),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
-- Create index "idx_analysis_reports_overall_score" to table: "analysis_reports"
CREATE INDEX "idx_analysis_reports_overall_score" ON "analysis_reports" ("overall_score");
-- Create index "idx_analysis_reports_variant_id" to table: "analysis_reports"
CREATE INDEX "idx_analysis_reports_variant_id" ON "analysis_reports" ("variant_id");
-- Create "design_guide_likes" table
CREATE TABLE "design_guide_likes" (
  "id" bigserial NOT NULL,
  "design_guide_id" bigint NOT NULL,
  "user_id" bigint NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
-- Create index "idx_design_guide_likes_design_guide_id" to table: "design_guide_likes"
CREATE INDEX "idx_design_guide_likes_design_guide_id" ON "design_guide_likes" ("design_guide_id");
-- Create index "idx_design_guide_likes_design_guide_user" to table: "design_guide_likes"
CREATE UNIQUE INDEX "idx_design_guide_likes_design_guide_user" ON "design_guide_likes" ("design_guide_id", "user_id");
-- Create index "idx_design_guide_likes_user_id" to table: "design_guide_likes"
CREATE INDEX "idx_design_guide_likes_user_id" ON "design_guide_likes" ("user_id");
-- Create "design_guides" table
CREATE TABLE "design_guides" (
  "id" bigserial NOT NULL,
  "name" character varying(255) NOT NULL,
  "description" text NULL,
  "content" text NOT NULL,
  "visibility" character varying(20) NOT NULL,
  "created_by" bigint NOT NULL,
  "team_id" bigint NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
-- Create index "idx_design_guides_created_by" to table: "design_guides"
CREATE INDEX "idx_design_guides_created_by" ON "design_guides" ("created_by");
-- Create index "idx_design_guides_team_id" to table: "design_guides"
CREATE INDEX "idx_design_guides_team_id" ON "design_guides" ("team_id");
-- Create index "idx_design_guides_visibility" to table: "design_guides"
CREATE INDEX "idx_design_guides_visibility" ON "design_guides" ("visibility");
-- Create "edges" table
CREATE TABLE "edges" (
  "id" bigserial NOT NULL,
  "variant_id" bigint NOT NULL,
  "from_node_id" bigint NOT NULL,
  "to_node_id" bigint NOT NULL,
  "kind" character varying(50) NOT NULL,
  "style" character varying(20) NOT NULL DEFAULT 'solid',
  "label" text NULL,
  "metadata" jsonb NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
-- Create index "idx_edges_from_node_id" to table: "edges"
CREATE INDEX "idx_edges_from_node_id" ON "edges" ("from_node_id");
-- Create index "idx_edges_to_node_id" to table: "edges"
CREATE INDEX "idx_edges_to_node_id" ON "edges" ("to_node_id");
-- Create index "idx_edges_variant_id" to table: "edges"
CREATE INDEX "idx_edges_variant_id" ON "edges" ("variant_id");
-- Create index "idx_edges_variant_nodes_kind" to table: "edges"
CREATE UNIQUE INDEX "idx_edges_variant_nodes_kind" ON "edges" ("variant_id", "from_node_id", "to_node_id", "kind");
-- Create "nodes" table
CREATE TABLE "nodes" (
  "id" bigserial NOT NULL,
  "variant_id" bigint NOT NULL,
  "kind" character varying(50) NOT NULL,
  "title" character varying(255) NOT NULL,
  "file_path" text NULL,
  "signature" text NULL,
  "receiver" text NULL,
  "code_text" text NULL,
  "position_x" numeric NOT NULL DEFAULT 0,
  "position_y" numeric NOT NULL DEFAULT 0,
  "metadata" jsonb NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
-- Create index "idx_nodes_kind" to table: "nodes"
CREATE INDEX "idx_nodes_kind" ON "nodes" ("kind");
-- Create index "idx_nodes_title" to table: "nodes"
CREATE INDEX "idx_nodes_title" ON "nodes" ("title");
-- Create index "idx_nodes_variant_id" to table: "nodes"
CREATE INDEX "idx_nodes_variant_id" ON "nodes" ("variant_id");
-- Create "project_shares" table
CREATE TABLE "project_shares" (
  "id" bigserial NOT NULL,
  "project_id" bigint NOT NULL,
  "team_id" bigint NOT NULL,
  "shared_by" bigint NOT NULL,
  "shared_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
-- Create index "idx_project_shares_project_id" to table: "project_shares"
CREATE INDEX "idx_project_shares_project_id" ON "project_shares" ("project_id");
-- Create index "idx_project_shares_project_team" to table: "project_shares"
CREATE UNIQUE INDEX "idx_project_shares_project_team" ON "project_shares" ("project_id", "team_id");
-- Create index "idx_project_shares_team_id" to table: "project_shares"
CREATE INDEX "idx_project_shares_team_id" ON "project_shares" ("team_id");
-- Create "projects" table
CREATE TABLE "projects" (
  "id" bigserial NOT NULL,
  "name" character varying(255) NOT NULL,
  "description" text NULL,
  "owner_id" bigint NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
-- Create index "idx_projects_owner_id" to table: "projects"
CREATE INDEX "idx_projects_owner_id" ON "projects" ("owner_id");
-- Create "team_members" table
CREATE TABLE "team_members" (
  "id" bigserial NOT NULL,
  "team_id" bigint NOT NULL,
  "user_id" bigint NOT NULL,
  "joined_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
-- Create index "idx_team_members_team_id" to table: "team_members"
CREATE INDEX "idx_team_members_team_id" ON "team_members" ("team_id");
-- Create index "idx_team_members_team_user" to table: "team_members"
CREATE UNIQUE INDEX "idx_team_members_team_user" ON "team_members" ("team_id", "user_id");
-- Create index "idx_team_members_user_id" to table: "team_members"
CREATE INDEX "idx_team_members_user_id" ON "team_members" ("user_id");
-- Create "teams" table
CREATE TABLE "teams" (
  "id" bigserial NOT NULL,
  "name" character varying(255) NOT NULL,
  "description" text NULL,
  "avatar_url" text NULL,
  "created_by" bigint NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
-- Create index "idx_teams_created_by" to table: "teams"
CREATE INDEX "idx_teams_created_by" ON "teams" ("created_by");
-- Create "users" table
CREATE TABLE "users" (
  "id" bigserial NOT NULL,
  "email" character varying(255) NOT NULL,
  "name" character varying(255) NOT NULL,
  "avatar_url" text NULL,
  "last_login_at" timestamptz NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
-- Create index "idx_users_email" to table: "users"
CREATE UNIQUE INDEX "idx_users_email" ON "users" ("email");
-- Create "variants" table
CREATE TABLE "variants" (
  "id" bigserial NOT NULL,
  "project_id" bigint NOT NULL,
  "name" character varying(255) NOT NULL,
  "description" text NULL,
  "is_main" boolean NOT NULL DEFAULT false,
  "parent_variant_id" bigint NULL,
  "design_guide_id" bigint NULL,
  "analysis_score" integer NULL,
  "created_by" bigint NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
-- Create index "idx_variants_is_main" to table: "variants"
CREATE INDEX "idx_variants_is_main" ON "variants" ("is_main");
-- Create index "idx_variants_parent_variant_id" to table: "variants"
CREATE INDEX "idx_variants_parent_variant_id" ON "variants" ("parent_variant_id");
-- Create index "idx_variants_project_id" to table: "variants"
CREATE INDEX "idx_variants_project_id" ON "variants" ("project_id");
