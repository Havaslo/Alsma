import assert from "node:assert/strict";
import test from "node:test";

import { buildSipAcceptPayload } from "./voice-agent.sip.js";

test("SIP acceptance enables an audio response and the transfer tool", () => {
  const payload = buildSipAcceptPayload("Начни с приветствия.");
  assert.equal(payload.type, "realtime");
  assert.deepEqual(payload.output_modalities, ["audio"]);
  assert.equal(payload.audio.input.turn_detection.create_response, true);
  assert.equal(
    payload.tools.some((tool) => tool.name === "transfer_to_manager"),
    true,
  );
});
