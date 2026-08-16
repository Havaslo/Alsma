CREATE TABLE "vk_webhook_updates" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "vk_webhook_updates_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "vk_webhook_updates_created_at_idx" ON "vk_webhook_updates"("created_at");
