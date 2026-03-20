ALTER TABLE "review_feedback_targets"
  ADD COLUMN "node_id" bigint NULL,
  ADD COLUMN "edge_id" bigint NULL,
  ADD COLUMN "file_path" text NULL;

UPDATE "review_feedback_targets"
SET "node_id" = "target_ref"::bigint
WHERE "target_type" = 'node';

UPDATE "review_feedback_targets"
SET "edge_id" = "target_ref"::bigint
WHERE "target_type" = 'edge';

UPDATE "review_feedback_targets"
SET "file_path" = "target_ref"
WHERE "target_type" = 'file';

DROP INDEX IF EXISTS "idx_review_feedback_targets_target_type";

ALTER TABLE "review_feedback_targets"
  DROP COLUMN "target_type",
  DROP COLUMN "target_ref";

CREATE INDEX "idx_review_feedback_targets_node_id" ON "review_feedback_targets" ("node_id");
CREATE INDEX "idx_review_feedback_targets_edge_id" ON "review_feedback_targets" ("edge_id");
