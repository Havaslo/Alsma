ALTER TABLE "vk_webhook_updates"
ADD COLUMN "payload" JSONB NOT NULL DEFAULT '{}';
