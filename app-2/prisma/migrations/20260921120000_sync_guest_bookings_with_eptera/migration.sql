ALTER TABLE "guest_bookings"
  ADD COLUMN "eptera_status" TEXT,
  ADD COLUMN "eptera_room_number" TEXT,
  ADD COLUMN "eptera_sync_status" TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN "eptera_sync_attempted_at" TIMESTAMPTZ(3),
  ADD COLUMN "eptera_last_synced_at" TIMESTAMPTZ(3),
  ADD COLUMN "eptera_sync_error" TEXT,
  ADD COLUMN "eptera_snapshot" JSONB;

CREATE INDEX "guest_bookings_eptera_sync_status_eptera_last_synced_at_idx"
  ON "guest_bookings"("eptera_sync_status", "eptera_last_synced_at");
