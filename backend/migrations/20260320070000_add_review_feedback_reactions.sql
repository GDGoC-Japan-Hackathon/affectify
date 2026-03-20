-- Create "review_feedback_reactions" table
CREATE TABLE "review_feedback_reactions" (
  "id" bigserial NOT NULL,
  "feedback_id" bigint NOT NULL,
  "user_id" bigint NOT NULL,
  "reaction" character varying(20) NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
-- Create index "idx_review_feedback_reactions_feedback_id" to table: "review_feedback_reactions"
CREATE INDEX "idx_review_feedback_reactions_feedback_id" ON "review_feedback_reactions" ("feedback_id");
-- Create index "idx_review_feedback_reactions_user_id" to table: "review_feedback_reactions"
CREATE INDEX "idx_review_feedback_reactions_user_id" ON "review_feedback_reactions" ("user_id");
-- Create index "idx_review_feedback_reactions_feedback_user" to table: "review_feedback_reactions"
CREATE UNIQUE INDEX "idx_review_feedback_reactions_feedback_user" ON "review_feedback_reactions" ("feedback_id", "user_id");
