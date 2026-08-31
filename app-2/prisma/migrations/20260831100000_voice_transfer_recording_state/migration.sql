ALTER TABLE "voice_calls"
  ADD COLUMN "recording_status" TEXT,
  ADD COLUMN "transfer_command_id" TEXT,
  ADD COLUMN "transfer_state" TEXT;

CREATE INDEX "voice_calls_transfer_command_id_idx"
  ON "voice_calls"("transfer_command_id");
