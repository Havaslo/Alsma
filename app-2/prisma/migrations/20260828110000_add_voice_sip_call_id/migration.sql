ALTER TABLE "voice_calls" ADD COLUMN "sip_call_id" TEXT;
CREATE UNIQUE INDEX "voice_calls_sip_call_id_key" ON "voice_calls"("sip_call_id");
