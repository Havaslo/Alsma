ALTER TABLE "admin_push_events"
  ADD COLUMN "event_kind" TEXT NOT NULL DEFAULT 'created';

CREATE FUNCTION enqueue_manager_request_push_event() RETURNS TRIGGER AS $$
DECLARE
  manager_was_requested BOOLEAN;
BEGIN
  IF TG_OP = 'INSERT' THEN
    manager_was_requested := NEW."details" ->> 'managerRequested' = 'true';
  ELSE
    manager_was_requested :=
      NEW."details" ->> 'managerRequested' = 'true'
      AND COALESCE(OLD."details" ->> 'managerRequested', 'false') <> 'true';
  END IF;

  IF manager_was_requested THEN
    INSERT INTO "admin_push_events" ("type", "event_kind", "entity_id")
    VALUES ('request', 'manager_requested', NEW."id");
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER admin_requests_manager_request_push
  AFTER INSERT OR UPDATE OF "details" ON "admin_requests"
  FOR EACH ROW EXECUTE FUNCTION enqueue_manager_request_push_event();
