ALTER TABLE "service_bookings"
  ADD COLUMN "responsible_manager_id" UUID;

ALTER TABLE "service_bookings"
  ADD CONSTRAINT "service_bookings_responsible_manager_id_fkey"
  FOREIGN KEY ("responsible_manager_id") REFERENCES "admin_users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "service_bookings_responsible_manager_id_idx"
  ON "service_bookings"("responsible_manager_id");
