ALTER TABLE "content_plan_posts"
ADD COLUMN "publication_attempted_at" TIMESTAMPTZ(3),
ADD COLUMN "publication_error" TEXT,
ADD COLUMN "published_at" TIMESTAMPTZ(3),
ADD COLUMN "published_external_id" VARCHAR(255),
ADD COLUMN "published_url" TEXT;
