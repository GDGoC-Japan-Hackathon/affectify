CREATE TABLE "review_apply_jobs" (
  "id" bigserial NOT NULL,
  "variant_id" bigint NOT NULL,
  "review_job_id" bigint NOT NULL,
  "requested_by" bigint NOT NULL,
  "status" varchar(30) NOT NULL,
  "error_message" text NULL,
  "started_at" timestamptz NULL,
  "finished_at" timestamptz NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);

CREATE INDEX "idx_review_apply_jobs_variant_id" ON "review_apply_jobs" ("variant_id");
CREATE INDEX "idx_review_apply_jobs_review_job_id" ON "review_apply_jobs" ("review_job_id");
CREATE INDEX "idx_review_apply_jobs_requested_by" ON "review_apply_jobs" ("requested_by");
CREATE INDEX "idx_review_apply_jobs_status" ON "review_apply_jobs" ("status");
