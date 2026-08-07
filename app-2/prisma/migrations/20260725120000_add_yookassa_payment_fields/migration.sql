ALTER TABLE "guest_bookings"
  ADD COLUMN "payment_amount" DECIMAL(12,2),
  ADD COLUMN "payment_id" TEXT;

CREATE UNIQUE INDEX "guest_bookings_payment_id_key"
  ON "guest_bookings"("payment_id");
