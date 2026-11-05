import assert from "node:assert/strict";
import test from "node:test";

import { extractVkAccessToken } from "./vk-access-token-input.js";
import { createVkPhotoAccessStore } from "./vk-photo-access-store.js";

test("access is admin scoped, replaceable and times out", () => {
  let time = 1000;
  const store = createVkPhotoAccessStore(() => time);
  store.set("alice", "first");
  assert.equal(store.get("alice"), "first");
  assert.equal(store.get("bob"), undefined);
  store.set("alice", "second");
  assert.equal(store.get("alice"), "second");
  store.clear("alice");
  assert.equal(store.get("alice"), undefined);
  store.set("alice", "third");
  time += 60 * 60_000;
  assert.equal(store.get("alice"), undefined);
});

test("an address from VK yields only the access token", () => {
  const token = "vk1.a.abcdefghijklmnopqrstuvwxyz0123456789";
  assert.equal(
    extractVkAccessToken(
      `https://oauth.vk.com/blank.html#access_token=${token}&expires_in=86400&user_id=1`,
    ),
    token,
  );
  assert.equal(extractVkAccessToken(token), token);
  assert.equal(extractVkAccessToken("https://oauth.vk.com/blank.html"), null);
  assert.equal(extractVkAccessToken("access_token=short"), null);
  assert.equal(extractVkAccessToken(""), null);
});

test("a token with encoded characters survives the address", () => {
  const token = "vk1.a.AbC+dEf/ghIjKlMnOpQrStUvWxYz0123456789==";
  assert.equal(
    extractVkAccessToken(
      `https://oauth.vk.com/blank.html#access_token=${encodeURIComponent(token)}&expires_in=86400`,
    ),
    token,
  );
  assert.equal(extractVkAccessToken(token), token);
});
