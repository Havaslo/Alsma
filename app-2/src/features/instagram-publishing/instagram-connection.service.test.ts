import assert from "node:assert/strict";
import test from "node:test";

import {
  decryptInstagramToken,
  encryptInstagramToken,
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
