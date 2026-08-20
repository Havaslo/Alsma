ALTER TABLE "guest_bookings"
  ADD COLUMN "contact_first_name" TEXT,
  ADD COLUMN "contact_last_name" TEXT,
  ADD COLUMN "contact_comment" TEXT,
  ADD COLUMN "guest_list" JSONB;
