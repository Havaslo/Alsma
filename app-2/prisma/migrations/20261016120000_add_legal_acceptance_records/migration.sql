ALTER TABLE "service_orders"
  ADD COLUMN "legal_acceptances" JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE "guest_email_verifications"
  ADD COLUMN "legal_acceptances" JSONB NOT NULL DEFAULT '[]'::jsonb;
