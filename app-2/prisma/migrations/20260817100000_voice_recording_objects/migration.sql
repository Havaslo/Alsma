ALTER TABLE "voice_calls" ADD COLUMN "recording_object_id" TEXT;
CREATE INDEX "voice_calls_ended_at_idx" ON "voice_calls"("ended_at");
