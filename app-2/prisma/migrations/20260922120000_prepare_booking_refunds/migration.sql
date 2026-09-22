ALTER TABLE "guest_booking_groups"
  ADD COLUMN "cancellation_requested_at" TIMESTAMPTZ(3),
  ADD COLUMN "cancellation_reason" TEXT,
  ADD COLUMN "refund_status" TEXT NOT NULL DEFAULT 'not_started',
  ADD COLUMN "refund_requested_at" TIMESTAMPTZ(3),
  ADD COLUMN "refund_amount" DECIMAL(12,2),
  ADD COLUMN "refund_id" TEXT,
  ADD COLUMN "refund_error_code" TEXT,
  ADD COLUMN "refund_error_message" TEXT,
  ADD COLUMN "refunded_at" TIMESTAMPTZ(3);

ALTER TABLE "guest_bookings"
  ADD COLUMN "cancellation_requested_at" TIMESTAMPTZ(3),
  ADD COLUMN "cancellation_reason" TEXT,
  ADD COLUMN "refund_status" TEXT NOT NULL DEFAULT 'not_started',
  ADD COLUMN "refund_requested_at" TIMESTAMPTZ(3),
  ADD COLUMN "refund_amount" DECIMAL(12,2),
  ADD COLUMN "refund_id" TEXT,
  ADD COLUMN "refund_error_code" TEXT,
  ADD COLUMN "refund_error_message" TEXT,
  ADD COLUMN "refunded_at" TIMESTAMPTZ(3);

CREATE INDEX "guest_booking_groups_refund_status_refund_requested_at_idx"
  ON "guest_booking_groups"("refund_status", "refund_requested_at");

CREATE INDEX "guest_bookings_refund_status_refund_requested_at_idx"
  ON "guest_bookings"("refund_status", "refund_requested_at");
