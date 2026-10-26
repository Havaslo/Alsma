import assert from "node:assert/strict";
import test from "node:test";

import {
  decryptInstagramToken,
  encryptInstagramToken,
  hasInstagramPublishingPageTask,
} from "./instagram-connection.service.js";

const key = Buffer.alloc(32, 19).toString("base64");

test("Instagram access tokens are encrypted and can be decrypted", () => {
  const token = "meta-access-token-for-test-only";
  const encrypted = encryptInstagramToken(token, key, Buffer.alloc(12, 8));

  assert.notEqual(encrypted, token);
  assert.equal(decryptInstagramToken(encrypted, key), token);
});

test("Instagram token ciphertext cannot be opened with a different key", () => {
  const encrypted = encryptInstagramToken("private-token", key);
  const otherKey = Buffer.alloc(32, 20).toString("base64");

  assert.throws(() => decryptInstagramToken(encrypted, otherKey));
});

test("Instagram publishing accepts legacy and current Meta Page task names", () => {
  for (const task of [
    "CREATE_CONTENT",
    "MANAGE",
    "PROFILE_PLUS_CREATE_CONTENT",
    "PROFILE_PLUS_FULL_CONTROL",
    "PROFILE_PLUS_MANAGE",
  ]) {
    assert.equal(hasInstagramPublishingPageTask([task]), true, task);
  }
});

test("Instagram publishing rejects Page tasks without content access", () => {
  assert.equal(hasInstagramPublishingPageTask(["ANALYZE", "MODERATE"]), false);
  assert.equal(hasInstagramPublishingPageTask(undefined), false);
});
