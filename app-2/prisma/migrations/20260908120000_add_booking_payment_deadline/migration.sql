ALTER TABLE "guest_bookings"
  ADD COLUMN "payment_deadline_at" TIMESTAMPTZ(3),
  ADD COLUMN "cancellation_status" TEXT NOT NULL DEFAULT 'not_started',
  ADD COLUMN "cancellation_attempted_at" TIMESTAMPTZ(3),
  ADD COLUMN "cancellation_error_code" TEXT,
  ADD COLUMN "cancellation_error_message" TEXT,
  ADD COLUMN "cancelled_at" TIMESTAMPTZ(3);

CREATE INDEX "guest_bookings_payment_status_payment_deadline_at_cancellation_status_idx"
  ON "guest_bookings"("payment_status", "payment_deadline_at", "cancellation_status");
