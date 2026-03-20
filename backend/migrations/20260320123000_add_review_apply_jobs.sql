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
  PRIMARY KEY ("id"),
  CONSTRAINT "fk_review_apply_jobs_variant" FOREIGN KEY ("variant_id") REFERENCES "variants" ("id") ON UPDATE NO ACTION ON DELETE CASCADE,
  CONSTRAINT "fk_review_apply_jobs_review_job" FOREIGN KEY ("review_job_id") REFERENCES "review_jobs" ("id") ON UPDATE NO ACTION ON DELETE CASCADE,
  CONSTRAINT "fk_review_apply_jobs_requested_by" FOREIGN KEY ("requested_by") REFERENCES "users" ("id") ON UPDATE NO ACTION ON DELETE RESTRICT
);

CREATE INDEX "idx_review_apply_jobs_variant_id" ON "review_apply_jobs" ("variant_id");
CREATE INDEX "idx_review_apply_jobs_review_job_id" ON "review_apply_jobs" ("review_job_id");
CREATE INDEX "idx_review_apply_jobs_requested_by" ON "review_apply_jobs" ("requested_by");
CREATE INDEX "idx_review_apply_jobs_status" ON "review_apply_jobs" ("status");
