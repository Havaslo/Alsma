CREATE TABLE "app_settings" (
    "key" TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "value" JSONB NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key")
);
