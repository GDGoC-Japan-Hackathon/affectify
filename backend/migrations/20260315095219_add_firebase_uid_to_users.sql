-- Modify "users" table
ALTER TABLE "users" ADD COLUMN "firebase_uid" character varying(128) NOT NULL;
-- Create index "idx_users_firebase_uid" to table: "users"
CREATE UNIQUE INDEX "idx_users_firebase_uid" ON "users" ("firebase_uid");
