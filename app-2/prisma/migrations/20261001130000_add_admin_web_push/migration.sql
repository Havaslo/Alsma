CREATE TYPE "AdminPushEventType" AS ENUM ('lead', 'request', 'booking');

CREATE TYPE "AdminPushEnvironment" AS ENUM ('development', 'production');

CREATE TABLE "admin_push_subscriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "environment" "AdminPushEnvironment" NOT NULL,
    "endpoint" TEXT NOT NULL,
    "endpoint_hash" CHAR(64) NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "admin_push_subscriptions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "admin_push_subscriptions_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "admin_push_subscriptions_environment_endpoint_hash_key"
  ON "admin_push_subscriptions"("environment", "endpoint_hash");
CREATE INDEX "admin_push_subscriptions_user_id_environment_idx"
  ON "admin_push_subscriptions"("user_id", "environment");

CREATE TABLE "admin_push_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" "AdminPushEventType" NOT NULL,
    "entity_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "delivered_at_development" TIMESTAMPTZ(3),
    "delivered_at_production" TIMESTAMPTZ(3),

    CONSTRAINT "admin_push_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "admin_push_events_created_at_id_idx"
  ON "admin_push_events"("created_at", "id");

CREATE FUNCTION enqueue_admin_push_event() RETURNS TRIGGER AS $$
DECLARE
  event_type "AdminPushEventType";
BEGIN
  event_type := CASE TG_TABLE_NAME
    WHEN 'site_leads' THEN 'lead'::"AdminPushEventType"
    WHEN 'admin_requests' THEN 'request'::"AdminPushEventType"
    WHEN 'booking_requests' THEN 'booking'::"AdminPushEventType"
    ELSE NULL
  END;

  IF event_type IS NOT NULL THEN
    INSERT INTO "admin_push_events" ("type", "entity_id") VALUES (event_type, NEW."id");
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER site_leads_enqueue_admin_push
  AFTER INSERT ON "site_leads"
  FOR EACH ROW EXECUTE FUNCTION enqueue_admin_push_event();

CREATE TRIGGER admin_requests_enqueue_admin_push
  AFTER INSERT ON "admin_requests"
  FOR EACH ROW EXECUTE FUNCTION enqueue_admin_push_event();

CREATE TRIGGER booking_requests_enqueue_admin_push
  AFTER INSERT ON "booking_requests"
  FOR EACH ROW EXECUTE FUNCTION enqueue_admin_push_event();
