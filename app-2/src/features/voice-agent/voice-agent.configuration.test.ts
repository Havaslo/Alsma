import assert from "node:assert/strict";
import test from "node:test";

import { buildVoiceAgentConfiguration } from "./voice-agent.configuration.js";
import { voiceResponseSpeed } from "./voice-agent.settings.js";

test("starts calls with the configured Russian voice at slightly faster speed", () => {
  const configuration = buildVoiceAgentConfiguration("voice instructions");

  assert.equal(configuration.instructions, "voice instructions");
  assert.equal(configuration.audio.output.voice, "shimmer");
  assert.equal(configuration.audio.output.speed, voiceResponseSpeed);
  assert.equal(configuration.audio.output.speed, 1.1);
});
