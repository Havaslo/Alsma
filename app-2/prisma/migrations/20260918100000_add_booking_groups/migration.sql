CREATE TABLE "guest_booking_groups" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "check_in_date" DATE NOT NULL,
  "check_out_date" DATE NOT NULL,
  "rooms_count" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'creating_reservations',
  "reservation_creation_status" TEXT NOT NULL DEFAULT 'processing',
  "reservation_creation_error_code" TEXT,
  "reservation_creation_error_message" TEXT,
  "reservation_ids" JSONB,
  "total_amount" DECIMAL(12,2),
  "currency" TEXT NOT NULL DEFAULT 'RUB',
  "payment_status" TEXT NOT NULL DEFAULT 'payment_pending',
  "payment_method" TEXT NOT NULL DEFAULT 'full',
  "payment_amount" DECIMAL(12,2),
  "payment_id" TEXT,
  "payment_deadline_at" TIMESTAMPTZ(3),
  "cancellation_status" TEXT NOT NULL DEFAULT 'not_started',
  "cancellation_attempted_at" TIMESTAMPTZ(3),
  "cancellation_error_code" TEXT,
  "cancellation_error_message" TEXT,
  "cancelled_at" TIMESTAMPTZ(3),
  "contact_first_name" TEXT,
  "contact_last_name" TEXT,
  "contact_phone" TEXT,
  "contact_email" TEXT,
  "contact_comment" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "guest_booking_groups_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "guest_booking_groups_payment_id_key" UNIQUE ("payment_id"),
  CONSTRAINT "guest_booking_groups_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "guest_users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

ALTER TABLE "guest_bookings"
  ADD COLUMN "group_id" UUID,
  ADD CONSTRAINT "guest_bookings_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "guest_booking_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "guest_booking_groups_user_id_created_at_idx"
  ON "guest_booking_groups"("user_id", "created_at");
CREATE INDEX "guest_booking_groups_payment_status_payment_deadline_at_cancellation_status_idx"
  ON "guest_booking_groups"("payment_status", "payment_deadline_at", "cancellation_status");
CREATE INDEX "guest_bookings_group_id_idx" ON "guest_bookings"("group_id");
