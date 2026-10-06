CREATE TABLE "content_plan_imports" (
    "id" UUID NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_plan_imports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "content_plan_posts" (
    "id" UUID NOT NULL,
    "import_id" UUID NOT NULL,
    "source_row" INTEGER NOT NULL,
    "scheduled_date" DATE NOT NULL,
    "scheduled_time" VARCHAR(5) NOT NULL DEFAULT '12:00',
    "post_type" VARCHAR(120) NOT NULL,
    "channel" VARCHAR(40) NOT NULL,
    "format" VARCHAR(120) NOT NULL,
    "topic" VARCHAR(255) NOT NULL,
    "audience" VARCHAR(1000) NOT NULL DEFAULT '',
    "key_facts" TEXT NOT NULL DEFAULT '',
    "call_to_action" TEXT NOT NULL DEFAULT '',
    "style_guidance" TEXT NOT NULL DEFAULT '',
    "image_prompt" TEXT NOT NULL DEFAULT '',
    "source_image_recommendation" TEXT NOT NULL DEFAULT '',
    "generated_title" VARCHAR(255) NOT NULL DEFAULT '',
    "generated_copy" TEXT NOT NULL DEFAULT '',
    "status" VARCHAR(24) NOT NULL DEFAULT 'queued',
    "generation_error" TEXT,
    "approved_at" TIMESTAMPTZ(3),
    "approved_by_id" UUID,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_plan_posts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "content_plan_imports_created_at_idx"
    ON "content_plan_imports"("created_at" DESC);
CREATE INDEX "content_plan_posts_scheduled_date_scheduled_time_idx"
    ON "content_plan_posts"("scheduled_date", "scheduled_time");
CREATE INDEX "content_plan_posts_status_updated_at_idx"
    ON "content_plan_posts"("status", "updated_at");
CREATE INDEX "content_plan_posts_import_id_source_row_idx"
    ON "content_plan_posts"("import_id", "source_row");

ALTER TABLE "content_plan_imports"
    ADD CONSTRAINT "content_plan_imports_created_by_id_fkey"
    FOREIGN KEY ("created_by_id") REFERENCES "admin_users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "content_plan_posts"
    ADD CONSTRAINT "content_plan_posts_import_id_fkey"
    FOREIGN KEY ("import_id") REFERENCES "content_plan_imports"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "content_plan_posts_approved_by_id_fkey"
    FOREIGN KEY ("approved_by_id") REFERENCES "admin_users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "content_plan_posts_created_by_id_fkey"
    FOREIGN KEY ("created_by_id") REFERENCES "admin_users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
