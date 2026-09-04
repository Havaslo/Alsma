ALTER TABLE "service_orders"
ADD COLUMN "payment_status" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN "paid_at" TIMESTAMPTZ(3);
