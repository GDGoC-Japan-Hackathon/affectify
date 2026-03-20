-- Modify "analysis_reports" table
ALTER TABLE "analysis_reports" ADD COLUMN "review_job_id" bigint NULL, ADD COLUMN "summary" text NULL;
-- Create index "idx_analysis_reports_review_job_id" to table: "analysis_reports"
CREATE INDEX "idx_analysis_reports_review_job_id" ON "analysis_reports" ("review_job_id");
-- Modify "design_guides" table
ALTER TABLE "design_guides" ADD COLUMN "visibility" character varying(30) NOT NULL DEFAULT 'private', ADD COLUMN "source_guide_id" bigint NULL, ADD COLUMN "is_template" boolean NOT NULL DEFAULT false, ADD COLUMN "published_at" timestamptz NULL;
-- Create index "idx_design_guides_is_template" to table: "design_guides"
CREATE INDEX "idx_design_guides_is_template" ON "design_guides" ("is_template");
-- Create index "idx_design_guides_source_guide_id" to table: "design_guides"
CREATE INDEX "idx_design_guides_source_guide_id" ON "design_guides" ("source_guide_id");
-- Create index "idx_design_guides_visibility" to table: "design_guides"
CREATE INDEX "idx_design_guides_visibility" ON "design_guides" ("visibility");
-- Modify "nodes" table
ALTER TABLE "nodes" DROP COLUMN "file_path", ADD COLUMN "variant_file_id" bigint NULL;
-- Create index "idx_nodes_variant_file_id" to table: "nodes"
CREATE INDEX "idx_nodes_variant_file_id" ON "nodes" ("variant_file_id");
-- Modify "project_members" table
ALTER TABLE "project_members" ADD COLUMN "role" character varying(30) NOT NULL DEFAULT 'editor';
-- Modify "variants" table
ALTER TABLE "variants" DROP COLUMN "parent_variant_id", DROP COLUMN "design_guide_id", ADD COLUMN "forked_from_variant_id" bigint NULL, ADD COLUMN "status" character varying(30) NOT NULL DEFAULT 'active', ADD COLUMN "source_language" character varying(50) NULL, ADD COLUMN "source_root_uri" text NULL, ADD COLUMN "last_imported_at" timestamptz NULL, ADD COLUMN "last_reviewed_at" timestamptz NULL;
-- Create index "idx_variants_forked_from_variant_id" to table: "variants"
CREATE INDEX "idx_variants_forked_from_variant_id" ON "variants" ("forked_from_variant_id");
-- Create index "idx_variants_status" to table: "variants"
CREATE INDEX "idx_variants_status" ON "variants" ("status");
-- Create "graph_build_jobs" table
CREATE TABLE "graph_build_jobs" (
  "id" bigserial NOT NULL,
  "variant_id" bigint NOT NULL,
  "requested_by" bigint NOT NULL,
  "status" character varying(30) NOT NULL,
  "error_message" text NULL,
  "started_at" timestamptz NULL,
  "finished_at" timestamptz NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
-- Create index "idx_graph_build_jobs_requested_by" to table: "graph_build_jobs"
CREATE INDEX "idx_graph_build_jobs_requested_by" ON "graph_build_jobs" ("requested_by");
-- Create index "idx_graph_build_jobs_status" to table: "graph_build_jobs"
CREATE INDEX "idx_graph_build_jobs_status" ON "graph_build_jobs" ("status");
-- Create index "idx_graph_build_jobs_variant_id" to table: "graph_build_jobs"
CREATE INDEX "idx_graph_build_jobs_variant_id" ON "graph_build_jobs" ("variant_id");
-- Create "layout_jobs" table
CREATE TABLE "layout_jobs" (
  "id" bigserial NOT NULL,
  "variant_id" bigint NOT NULL,
  "requested_by" bigint NOT NULL,
  "layout_type" character varying(30) NOT NULL,
  "status" character varying(30) NOT NULL,
  "error_message" text NULL,
  "started_at" timestamptz NULL,
  "finished_at" timestamptz NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
-- Create index "idx_layout_jobs_requested_by" to table: "layout_jobs"
CREATE INDEX "idx_layout_jobs_requested_by" ON "layout_jobs" ("requested_by");
-- Create index "idx_layout_jobs_status" to table: "layout_jobs"
CREATE INDEX "idx_layout_jobs_status" ON "layout_jobs" ("status");
-- Create index "idx_layout_jobs_variant_id" to table: "layout_jobs"
CREATE INDEX "idx_layout_jobs_variant_id" ON "layout_jobs" ("variant_id");
-- Create "review_feedback_actions" table
CREATE TABLE "review_feedback_actions" (
  "id" bigserial NOT NULL,
  "feedback_id" bigint NOT NULL,
  "action_type" character varying(30) NOT NULL,
  "resolution" character varying(30) NULL,
  "acted_by" bigint NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
-- Create index "idx_review_feedback_actions_acted_by" to table: "review_feedback_actions"
CREATE INDEX "idx_review_feedback_actions_acted_by" ON "review_feedback_actions" ("acted_by");
-- Create index "idx_review_feedback_actions_created_at" to table: "review_feedback_actions"
CREATE INDEX "idx_review_feedback_actions_created_at" ON "review_feedback_actions" ("created_at");
-- Create index "idx_review_feedback_actions_feedback_id" to table: "review_feedback_actions"
CREATE INDEX "idx_review_feedback_actions_feedback_id" ON "review_feedback_actions" ("feedback_id");
-- Create "review_feedback_chats" table
CREATE TABLE "review_feedback_chats" (
  "id" bigserial NOT NULL,
  "feedback_id" bigint NOT NULL,
  "role" character varying(20) NOT NULL,
  "content" text NOT NULL,
  "created_by" bigint NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
-- Create index "idx_review_feedback_chats_created_at" to table: "review_feedback_chats"
CREATE INDEX "idx_review_feedback_chats_created_at" ON "review_feedback_chats" ("created_at");
-- Create index "idx_review_feedback_chats_created_by" to table: "review_feedback_chats"
CREATE INDEX "idx_review_feedback_chats_created_by" ON "review_feedback_chats" ("created_by");
-- Create index "idx_review_feedback_chats_feedback_id" to table: "review_feedback_chats"
CREATE INDEX "idx_review_feedback_chats_feedback_id" ON "review_feedback_chats" ("feedback_id");
-- Create "review_feedback_targets" table
CREATE TABLE "review_feedback_targets" (
  "id" bigserial NOT NULL,
  "feedback_id" bigint NOT NULL,
  "target_type" character varying(20) NOT NULL,
  "target_ref" text NOT NULL,
  PRIMARY KEY ("id")
);
-- Create index "idx_review_feedback_targets_feedback_id" to table: "review_feedback_targets"
CREATE INDEX "idx_review_feedback_targets_feedback_id" ON "review_feedback_targets" ("feedback_id");
-- Create index "idx_review_feedback_targets_target_type" to table: "review_feedback_targets"
CREATE INDEX "idx_review_feedback_targets_target_type" ON "review_feedback_targets" ("target_type");
-- Create "review_feedbacks" table
CREATE TABLE "review_feedbacks" (
  "id" bigserial NOT NULL,
  "review_job_id" bigint NOT NULL,
  "variant_id" bigint NOT NULL,
  "feedback_type" character varying(30) NOT NULL,
  "severity" character varying(20) NOT NULL,
  "title" character varying(255) NOT NULL,
  "description" text NOT NULL,
  "suggestion" text NOT NULL,
  "ai_recommendation" character varying(30) NULL,
  "resolution" character varying(30) NULL,
  "status" character varying(30) NOT NULL DEFAULT 'open',
  "display_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
-- Create index "idx_review_feedbacks_review_job_id" to table: "review_feedbacks"
CREATE INDEX "idx_review_feedbacks_review_job_id" ON "review_feedbacks" ("review_job_id");
-- Create index "idx_review_feedbacks_severity" to table: "review_feedbacks"
CREATE INDEX "idx_review_feedbacks_severity" ON "review_feedbacks" ("severity");
-- Create index "idx_review_feedbacks_status" to table: "review_feedbacks"
CREATE INDEX "idx_review_feedbacks_status" ON "review_feedbacks" ("status");
-- Create index "idx_review_feedbacks_variant_id" to table: "review_feedbacks"
CREATE INDEX "idx_review_feedbacks_variant_id" ON "review_feedbacks" ("variant_id");
-- Create "review_jobs" table
CREATE TABLE "review_jobs" (
  "id" bigserial NOT NULL,
  "variant_id" bigint NOT NULL,
  "requested_by" bigint NOT NULL,
  "status" character varying(30) NOT NULL,
  "error_message" text NULL,
  "started_at" timestamptz NULL,
  "finished_at" timestamptz NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
-- Create index "idx_review_jobs_requested_by" to table: "review_jobs"
CREATE INDEX "idx_review_jobs_requested_by" ON "review_jobs" ("requested_by");
-- Create index "idx_review_jobs_status" to table: "review_jobs"
CREATE INDEX "idx_review_jobs_status" ON "review_jobs" ("status");
-- Create index "idx_review_jobs_variant_id" to table: "review_jobs"
CREATE INDEX "idx_review_jobs_variant_id" ON "review_jobs" ("variant_id");
-- Create "variant_design_guides" table
CREATE TABLE "variant_design_guides" (
  "id" bigserial NOT NULL,
  "variant_id" bigint NOT NULL,
  "base_design_guide_id" bigint NULL,
  "title" character varying(255) NOT NULL,
  "description" text NULL,
  "content" text NOT NULL,
  "version" integer NOT NULL DEFAULT 1,
  "created_by" bigint NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
-- Create index "idx_variant_design_guides_base_design_guide_id" to table: "variant_design_guides"
CREATE INDEX "idx_variant_design_guides_base_design_guide_id" ON "variant_design_guides" ("base_design_guide_id");
-- Create index "idx_variant_design_guides_created_by" to table: "variant_design_guides"
CREATE INDEX "idx_variant_design_guides_created_by" ON "variant_design_guides" ("created_by");
-- Create index "idx_variant_design_guides_variant_id" to table: "variant_design_guides"
CREATE UNIQUE INDEX "idx_variant_design_guides_variant_id" ON "variant_design_guides" ("variant_id");
-- Create "variant_files" table
CREATE TABLE "variant_files" (
  "id" bigserial NOT NULL,
  "variant_id" bigint NOT NULL,
  "path" text NOT NULL,
  "language" character varying(50) NULL,
  "node_count" integer NOT NULL DEFAULT 0,
  "is_visible" boolean NOT NULL DEFAULT true,
  "display_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
-- Create index "idx_variant_files_is_visible" to table: "variant_files"
CREATE INDEX "idx_variant_files_is_visible" ON "variant_files" ("is_visible");
-- Create index "idx_variant_files_language" to table: "variant_files"
CREATE INDEX "idx_variant_files_language" ON "variant_files" ("language");
-- Create index "idx_variant_files_variant_id" to table: "variant_files"
CREATE INDEX "idx_variant_files_variant_id" ON "variant_files" ("variant_id");
-- Create index "idx_variant_files_variant_path" to table: "variant_files"
CREATE UNIQUE INDEX "idx_variant_files_variant_path" ON "variant_files" ("variant_id", "path");
