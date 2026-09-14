ALTER TABLE "guest_bookings"
  ADD COLUMN "eptera_payment_sync_status" TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN "eptera_payment_sync_attempted_at" TIMESTAMPTZ(3),
  ADD COLUMN "eptera_payment_synced_at" TIMESTAMPTZ(3);
