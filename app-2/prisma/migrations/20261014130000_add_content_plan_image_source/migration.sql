ALTER TABLE "content_plan_posts"
  ADD COLUMN "image_source_mode" VARCHAR(24) NOT NULL DEFAULT 'generate',
  ADD COLUMN "image_status" VARCHAR(24) NOT NULL DEFAULT 'pending',
  ADD COLUMN "image_error" TEXT;

UPDATE "content_plan_posts"
SET "image_status" = CASE
  WHEN cardinality("image_ids") > 0 THEN 'completed'
  WHEN "status" IN ('queued', 'generating') THEN 'pending'
  ELSE 'skipped'
END;
