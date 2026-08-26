import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { HttpError } from "../../lib/http/http-error.js";
import {
  parseMangoWebhook,
  verifyMangoSignature,
} from "./voice-agent.mango.js";

const apiKey = "test-mango-api-key";
const salt = "test-mango-salt";

const signedBody = (json: string) => ({
  json,
  sign: createHash("sha256").update(`${apiKey}${json}${salt}`).digest("hex"),
  vpbx_api_key: apiKey,
});

test("verifies the exact MANGO form signature without reserializing JSON", () => {
  const json = '{"entry_id":"entry","call_id":"call","seq":1}';
  const envelope = signedBody(json);

  assert.equal(
    verifyMangoSignature({
      apiKey,
      formApiKey: envelope.vpbx_api_key,
      json: envelope.json,
      salt,
      sign: envelope.sign,
    }),
    true,
  );
  assert.equal(
    verifyMangoSignature({
      ...envelope,
      apiKey,
      formApiKey: envelope.vpbx_api_key,
      json: `${json} `,
      salt,
    }),
    false,
  );
});

test("parses signed MANGO call, summary, and recording-added envelopes", () => {
  const call = parseMangoWebhook({
    apiKey,
    body: signedBody(
      JSON.stringify({
        call_id: "call",
        call_state: "Appeared",
        entry_id: "entry",
        from: { number: "70000000001" },
        location: "ivr",
        seq: 1,
        timestamp: 1_700_000_000,
      }),
    ),
    salt,
  });
  assert.equal(call.kind, "call");

  const summary = parseMangoWebhook({
    apiKey,
    body: signedBody(
      JSON.stringify({
        call_direction: 1,
        create_time: 1_700_000_000,
        end_time: 1_700_000_030,
        entry_id: "entry",
        entry_result: 1,
        from: { number: "70000000001" },
      }),
    ),
    salt,
  });
  assert.equal(summary.kind, "summary");

  const recording = parseMangoWebhook({
    apiKey,
    body: signedBody(
      JSON.stringify({
        entry_id: "entry",
        product_id: 1,
        recording_id: "recording",
        timestamp: 1_700_000_031,
        user_id: -1,
      }),
    ),
    salt,
  });
  assert.equal(recording.kind, "recording_added");
});

test("rejects invalid signed envelopes and retains normalized compatibility", () => {
  assert.throws(
    () =>
      parseMangoWebhook({
        apiKey,
        body: {
          ...signedBody('{"entry_id":"entry"}'),
          sign: "0".repeat(64),
        },
        salt,
      }),
    (error: unknown) => error instanceof HttpError && error.status === 401,
  );

  const normalized = parseMangoWebhook({
    body: { callId: "legacy-call", event: "connected" },
  });
  assert.equal(normalized.kind, "normalized");
});
