-- Modify "activity_logs" table
ALTER TABLE "activity_logs" DROP COLUMN "team_id";
-- Modify "design_guides" table
ALTER TABLE "design_guides" DROP COLUMN "visibility", DROP COLUMN "team_id";
-- Create "project_members" table
CREATE TABLE "project_members" (
  "id" bigserial NOT NULL,
  "project_id" bigint NOT NULL,
  "user_id" bigint NOT NULL,
  "invited_by" bigint NOT NULL,
  "joined_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
-- Create index "idx_project_members_project_id" to table: "project_members"
CREATE INDEX "idx_project_members_project_id" ON "project_members" ("project_id");
-- Create index "idx_project_members_project_user" to table: "project_members"
CREATE UNIQUE INDEX "idx_project_members_project_user" ON "project_members" ("project_id", "user_id");
-- Create index "idx_project_members_user_id" to table: "project_members"
CREATE INDEX "idx_project_members_user_id" ON "project_members" ("user_id");
-- Drop "project_shares" table
DROP TABLE "project_shares";
-- Drop "team_members" table
DROP TABLE "team_members";
-- Drop "teams" table
DROP TABLE "teams";
