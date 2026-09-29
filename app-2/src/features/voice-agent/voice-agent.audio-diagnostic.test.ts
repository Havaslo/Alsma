import assert from "node:assert/strict";
import test from "node:test";

import { pcm16Mono24kToWav } from "./voice-agent.audio-diagnostic.js";

test("wraps clean 24 kHz mono PCM output in a playable WAV file", () => {
  const pcm = Buffer.from([1, 2, 3, 4]);
  const wav = Buffer.from(pcm16Mono24kToWav(pcm));

  assert.equal(wav.subarray(0, 4).toString("ascii"), "RIFF");
  assert.equal(wav.subarray(8, 12).toString("ascii"), "WAVE");
  assert.equal(wav.readUInt16LE(22), 1);
  assert.equal(wav.readUInt32LE(24), 24_000);
  assert.equal(wav.readUInt16LE(34), 16);
  assert.equal(wav.readUInt32LE(40), pcm.byteLength);
  assert.deepEqual(wav.subarray(44), pcm);
});
