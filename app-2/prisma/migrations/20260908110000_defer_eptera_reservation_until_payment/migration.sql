ALTER TABLE "guest_bookings"
  ADD COLUMN "eptera_reservation_payload" JSONB,
  ADD COLUMN "eptera_reservation_sync_status" TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN "eptera_reservation_sync_attempted_at" TIMESTAMPTZ(3),
  ADD COLUMN "eptera_reservation_synced_at" TIMESTAMPTZ(3),
  ADD COLUMN "eptera_reservation_sync_error_code" TEXT,
  ADD COLUMN "eptera_reservation_sync_error_message" TEXT,
  ADD COLUMN "eptera_payment_sync_error_code" TEXT,
  ADD COLUMN "eptera_payment_sync_error_message" TEXT;
