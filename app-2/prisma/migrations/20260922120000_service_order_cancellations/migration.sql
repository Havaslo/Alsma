ALTER TABLE "service_orders"
  ADD COLUMN "cancellation_status" TEXT NOT NULL DEFAULT 'not_started',
  ADD COLUMN "cancellation_requested_at" TIMESTAMPTZ(3),
  ADD COLUMN "cancellation_reason" TEXT,
  ADD COLUMN "cancelled_at" TIMESTAMPTZ(3),
  ADD COLUMN "refund_status" TEXT NOT NULL DEFAULT 'not_started',
  ADD COLUMN "refund_id" TEXT,
  ADD COLUMN "refund_error" TEXT,
  ADD COLUMN "refunded_at" TIMESTAMPTZ(3);

CREATE INDEX "service_orders_user_id_cancellation_status_created_at_idx"
  ON "service_orders"("user_id", "cancellation_status", "created_at");

CREATE INDEX "service_orders_refund_status_created_at_idx"
  ON "service_orders"("refund_status", "created_at");
