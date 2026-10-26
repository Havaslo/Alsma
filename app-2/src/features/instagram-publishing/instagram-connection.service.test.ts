import assert from "node:assert/strict";
import test from "node:test";

import {
  decryptInstagramToken,
  encryptInstagramToken,
  getInstagramPageCandidate,
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

test("Instagram connection accepts the explicitly linked account without Page tasks", () => {
  assert.deepEqual(
    getInstagramPageCandidate({
      id: "page-id",
      access_token: "page-token",
      instagram_business_account: { id: "instagram-id" },
      tasks: ["ANALYZE"],
    }),
    {
      pageId: "page-id",
      pageToken: "page-token",
      instagramId: "instagram-id",
    },
  );
});

test("Instagram connection still requires a linked account and Page token", () => {
  assert.equal(
    getInstagramPageCandidate({
      id: "page-id",
      access_token: "page-token",
      tasks: ["CREATE_CONTENT"],
    }),
    null,
  );
  assert.equal(getInstagramPageCandidate(null), null);
});
