ALTER TABLE "voice_calls" ADD COLUMN "admin_request_id" UUID;

CREATE UNIQUE INDEX "voice_calls_admin_request_id_key"
  ON "voice_calls"("admin_request_id");

CREATE TEMP TABLE "voice_call_request_map" (
  "call_id" UUID NOT NULL PRIMARY KEY,
  "request_id" UUID NOT NULL UNIQUE
);

INSERT INTO "voice_call_request_map" ("call_id", "request_id")
SELECT "id", gen_random_uuid()
FROM "voice_calls"
WHERE "admin_request_id" IS NULL;

INSERT INTO "admin_requests" (
  "id", "title", "description", "requester", "contact", "category",
  "status", "details", "created_at", "updated_at"
)
SELECT
  map."request_id",
  'Входящий звонок',
  COALESCE(c."summary", 'Входящий звонок из телефонии.'),
  CASE WHEN jsonb_typeof(c."extracted"->'name') = 'string'
    THEN c."extracted"->>'name' ELSE NULL END,
  c."caller_phone",
  'voice-call',
  'new'::"LeadStatus",
  jsonb_build_object(
    'source', 'Звонки',
    'channelType', 'call',
    'voiceCallId', c."id"::text,
    'legacyVoiceCall', true
  ),
  c."created_at",
  c."updated_at"
FROM "voice_calls" c
JOIN "voice_call_request_map" map ON map."call_id" = c."id";

UPDATE "voice_calls" c
SET "admin_request_id" = map."request_id"
FROM "voice_call_request_map" map
WHERE c."id" = map."call_id";

DROP TABLE "voice_call_request_map";

ALTER TABLE "voice_calls"
  ADD CONSTRAINT "voice_calls_admin_request_id_fkey"
  FOREIGN KEY ("admin_request_id") REFERENCES "admin_requests"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
