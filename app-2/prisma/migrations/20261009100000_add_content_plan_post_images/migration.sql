ALTER TABLE "content_plan_posts"
ADD COLUMN "image_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
