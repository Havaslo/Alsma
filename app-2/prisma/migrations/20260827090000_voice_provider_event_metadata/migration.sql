ALTER TABLE "voice_calls"
  ADD COLUMN "provider_entry_id" TEXT,
  ADD COLUMN "provider_sequence" INTEGER,
  ADD COLUMN "provider_recording_id" TEXT;

CREATE INDEX "voice_calls_provider_entry_id_started_at_idx"
  ON "voice_calls"("provider_entry_id", "started_at");

CREATE TABLE "voice_webhook_events" (
  "id" UUID NOT NULL,
  "provider" TEXT NOT NULL,
  "event_key" TEXT NOT NULL,
  "entry_id" TEXT,
  "call_id" TEXT,
  "sequence" INTEGER,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "voice_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "voice_webhook_events_event_key_key"
  ON "voice_webhook_events"("event_key");
CREATE INDEX "voice_webhook_events_provider_entry_id_idx"
  ON "voice_webhook_events"("provider", "entry_id");
