ALTER TABLE "content_factory_image_generation_jobs"
ADD COLUMN "mode" VARCHAR(16) NOT NULL DEFAULT 'edit',
ADD COLUMN "reference_photos" JSONB NOT NULL DEFAULT '[]'::jsonb;
