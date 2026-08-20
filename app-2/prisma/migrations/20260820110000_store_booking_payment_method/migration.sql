ALTER TABLE "guest_bookings"
  ADD COLUMN "payment_method" TEXT NOT NULL DEFAULT 'full';
