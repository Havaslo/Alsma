import assert from "node:assert/strict";
import test from "node:test";

import { hasPlayableVoiceCallRecording } from "./admin-operations.repository.js";

test("requires a confirmed recording instead of only a Mango recording ID", () => {
  const base = {
    recordingObjectId: null,
    providerRecordingId: "mango-recording-id",
    recordingStatus: null,
  };

  assert.equal(hasPlayableVoiceCallRecording(base), false);
  assert.equal(
    hasPlayableVoiceCallRecording({ ...base, recordingStatus: "pending" }),
    false,
  );
  assert.equal(
    hasPlayableVoiceCallRecording({ ...base, recordingStatus: "error" }),
    false,
  );
  assert.equal(
    hasPlayableVoiceCallRecording({ ...base, recordingStatus: "completed" }),
    true,
  );
  assert.equal(
    hasPlayableVoiceCallRecording({ ...base, recordingStatus: "available" }),
    true,
  );
  assert.equal(
    hasPlayableVoiceCallRecording({
      ...base,
      recordingObjectId: "saved-audio",
    }),
    true,
  );
});
