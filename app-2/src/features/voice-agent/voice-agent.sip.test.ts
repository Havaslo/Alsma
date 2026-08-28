import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSipAcceptPayload,
  isRealtimeReadyEvent,
  isRealtimeTranscriptEvent,
} from "./voice-agent.sip.js";

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

test("waits for realtime readiness and recognizes both transcript roles", () => {
  assert.equal(isRealtimeReadyEvent("session.updated"), true);
  assert.equal(isRealtimeReadyEvent("response.created"), false);
  assert.equal(
    isRealtimeTranscriptEvent(
      "conversation.item.input_audio_transcription.completed",
    ),
    true,
  );
  assert.equal(
    isRealtimeTranscriptEvent("response.audio_transcript.done"),
    true,
  );
});
