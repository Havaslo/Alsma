CREATE TABLE "voice_calls" (
  "id" UUID NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 't2',
  "provider_call_id" TEXT,
  "caller_phone" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "outcome" TEXT,
  "started_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ended_at" TIMESTAMPTZ(3),
  "duration_sec" INTEGER,
  "transcript" JSONB NOT NULL DEFAULT '[]',
  "summary" TEXT,
  "intent" TEXT,
  "extracted" JSONB NOT NULL DEFAULT '{}',
  "recording_url" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "voice_calls_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "voice_calls_provider_call_id_key" ON "voice_calls"("provider_call_id");
CREATE INDEX "voice_calls_status_created_at_idx" ON "voice_calls"("status", "created_at");
CREATE INDEX "voice_calls_caller_phone_created_at_idx" ON "voice_calls"("caller_phone", "created_at");
