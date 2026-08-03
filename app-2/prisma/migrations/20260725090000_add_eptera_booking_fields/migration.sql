ALTER TABLE "guest_bookings"
  ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'RUB',
  ADD COLUMN "payment_status" TEXT NOT NULL DEFAULT 'payment_pending',
  ADD COLUMN "eptera_reservation_id" TEXT,
  ADD COLUMN "voucher_number" TEXT,
  ADD COLUMN "contact_phone" TEXT,
  ADD COLUMN "contact_email" TEXT,
  ADD COLUMN "selected_offer" JSONB;

CREATE UNIQUE INDEX "guest_bookings_eptera_reservation_id_key"
  ON "guest_bookings"("eptera_reservation_id");
