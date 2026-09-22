ALTER TABLE "service_orders"
  ADD COLUMN "checkout_request_id" UUID,
  ADD COLUMN "payment_provider" TEXT,
  ADD COLUMN "payment_error" TEXT,
  ADD COLUMN "payment_deadline_at" TIMESTAMPTZ(3);

CREATE UNIQUE INDEX "service_orders_checkout_request_id_key"
  ON "service_orders"("checkout_request_id");

ALTER TABLE "service_bookings"
  ADD COLUMN "hold_expires_at" TIMESTAMPTZ(3);

ALTER TABLE "payment_attempts"
  ADD COLUMN "idempotency_key" TEXT,
  ADD COLUMN "confirmation_url" TEXT,
  ADD COLUMN "amount" DECIMAL(12,2),
  ADD COLUMN "currency" TEXT,
  ADD COLUMN "last_error" TEXT,
  ADD COLUMN "expires_at" TIMESTAMPTZ(3),
  ADD COLUMN "captured_at" TIMESTAMPTZ(3),
  ADD COLUMN "cancelled_at" TIMESTAMPTZ(3),
  ADD COLUMN "refunded_at" TIMESTAMPTZ(3),
  ADD COLUMN "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX "payment_attempts_idempotency_key_key"
  ON "payment_attempts"("idempotency_key");

CREATE UNIQUE INDEX "payment_attempts_external_id_key"
  ON "payment_attempts"("external_id");

CREATE INDEX "service_bookings_hold_expires_at_status_idx"
  ON "service_bookings"("hold_expires_at", "status");
