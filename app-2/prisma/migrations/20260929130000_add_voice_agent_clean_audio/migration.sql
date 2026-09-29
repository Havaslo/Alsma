ALTER TABLE "voice_calls"
ADD COLUMN "agent_audio_object_id" TEXT,
ADD COLUMN "agent_audio_duration_ms" INTEGER,
ADD COLUMN "agent_audio_truncated" BOOLEAN NOT NULL DEFAULT false;
