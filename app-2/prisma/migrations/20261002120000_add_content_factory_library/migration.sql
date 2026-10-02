CREATE TABLE "content_factory_drafts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" VARCHAR(255) NOT NULL,
    "snapshot" JSONB NOT NULL,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "content_factory_drafts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "content_factory_drafts_created_by_id_fkey"
      FOREIGN KEY ("created_by_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "content_factory_drafts_updated_at_idx"
  ON "content_factory_drafts"("updated_at" DESC);

CREATE TABLE "content_factory_media" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "file_name" VARCHAR(255) NOT NULL,
    "content_type" VARCHAR(100) NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "object_id" TEXT NOT NULL,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_factory_media_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "content_factory_media_created_by_id_fkey"
      FOREIGN KEY ("created_by_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "content_factory_media_object_id_key"
  ON "content_factory_media"("object_id");
CREATE INDEX "content_factory_media_created_at_idx"
  ON "content_factory_media"("created_at" DESC);
