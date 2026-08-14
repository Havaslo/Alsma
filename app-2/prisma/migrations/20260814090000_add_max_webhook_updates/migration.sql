CREATE TABLE "max_webhook_updates" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "max_webhook_updates_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "max_webhook_updates_created_at_idx" ON "max_webhook_updates"("created_at");
