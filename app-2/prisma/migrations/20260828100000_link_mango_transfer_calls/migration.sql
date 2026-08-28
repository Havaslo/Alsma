ALTER TABLE "voice_calls"
  ADD COLUMN "mango_call_id" TEXT,
  ADD COLUMN "mango_transfer_initiator" TEXT;

CREATE INDEX "voice_calls_mango_call_id_idx"
  ON "voice_calls"("mango_call_id");
