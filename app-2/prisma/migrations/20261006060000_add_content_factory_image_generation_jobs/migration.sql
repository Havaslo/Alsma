CREATE TABLE "content_factory_image_generation_jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_by_id" UUID NOT NULL,
    "status" VARCHAR(24) NOT NULL DEFAULT 'pending',
    "prompt" TEXT NOT NULL DEFAULT '',
    "post_text" TEXT NOT NULL,
    "selected_channels" TEXT[] NOT NULL,
    "source_title" VARCHAR(255) NOT NULL,
    "source_category" VARCHAR(120) NOT NULL,
    "source_tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "reference_photo_object_id" TEXT NOT NULL,
    "result" JSONB,
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "content_factory_image_generation_jobs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "content_factory_image_generation_jobs_created_by_id_fkey"
      FOREIGN KEY ("created_by_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "content_factory_image_generation_jobs_created_by_id_created_at_idx"
  ON "content_factory_image_generation_jobs"("created_by_id", "created_at" DESC);
CREATE INDEX "content_factory_image_generation_jobs_status_updated_at_idx"
  ON "content_factory_image_generation_jobs"("status", "updated_at");
