CREATE TABLE "guest_email_verifications" (
  "id" UUID NOT NULL,
  "email" TEXT NOT NULL,
  "code_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMPTZ(3) NOT NULL,
  "consumed_at" TIMESTAMPTZ(3),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "last_sent_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "user_id" UUID,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "guest_email_verifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "guest_email_verifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "guest_users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "guest_email_verifications_email_created_at_idx" ON "guest_email_verifications"("email", "created_at");
