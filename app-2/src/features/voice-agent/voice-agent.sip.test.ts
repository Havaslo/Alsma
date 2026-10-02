import assert from "node:assert/strict";
import test from "node:test";

import {
  voiceResponseName,
  voiceResponseSpeed,
} from "./voice-agent.settings.js";
import {
  buildSipAcceptPayload,
  isRealtimeReadyEvent,
  isRealtimeTranscriptEvent,
} from "./voice-agent.sip.js";

test("SIP acceptance enables an audio response and the callback tool", () => {
  const payload = buildSipAcceptPayload("Начни с приветствия.");
  assert.equal(payload.type, "realtime");
  assert.deepEqual(payload.output_modalities, ["audio"]);
  assert.equal(payload.audio.input.turn_detection.create_response, true);
  assert.equal(payload.audio.input.turn_detection.threshold, 0.5);
  assert.equal(payload.audio.input.turn_detection.interrupt_response, true);
  assert.equal(payload.audio.output.voice, voiceResponseName);
  assert.equal(payload.audio.output.voice, "marin");
  assert.equal(payload.audio.output.speed, voiceResponseSpeed);
  const toolNames: readonly string[] = payload.tools.map((tool) => tool.name);
  assert.equal(toolNames.includes("request_callback"), true);
  assert.equal(toolNames.includes("transfer_to_manager"), false);
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
