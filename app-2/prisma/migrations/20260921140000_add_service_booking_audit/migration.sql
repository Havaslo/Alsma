ALTER TABLE "service_bookings"
  ADD COLUMN "booking_source" TEXT NOT NULL DEFAULT 'legacy',
  ADD COLUMN "created_by_admin_id" UUID;

ALTER TABLE "service_bookings"
  ADD CONSTRAINT "service_bookings_created_by_admin_id_fkey"
  FOREIGN KEY ("created_by_admin_id") REFERENCES "admin_users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "service_bookings_created_by_admin_id_idx"
  ON "service_bookings"("created_by_admin_id");
