ALTER TABLE "guest_email_verifications"
  ADD COLUMN "message_id" TEXT,
  ADD COLUMN "sent_at" TIMESTAMPTZ(3);

CREATE UNIQUE INDEX "guest_email_verifications_message_id_key"
  ON "guest_email_verifications"("message_id");
