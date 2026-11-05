import assert from "node:assert/strict";
import test from "node:test";

import { createVkPhotoTestConnection } from "./vk-photo-test-connection.js";

test("pairing is one use, admin scoped and times out", () => {
  let time = 1000;
  const store = createVkPhotoTestConnection(() => time);
  const code = store.start("alice")!;
  assert.match(code, /^[a-f0-9]{64}$/);
  const pair = store.consume(code)!;
  assert.equal(store.consume(code), null);
  assert.equal(pair.adminId, "alice");
  assert.equal(store.set(pair, "secret"), true);
  assert.equal(store.get("alice"), "secret");
  assert.equal(store.get("bob"), undefined);
  store.clear("alice");
  assert.equal(store.get("alice"), undefined);
  const expiredCode = store.start("alice")!;
  time += 5 * 60_000;
  assert.equal(store.consume(expiredCode), null);
  const code2 = store.start("alice")!;
  const pair2 = store.consume(code2)!;
  store.set(pair2, "secret");
  time += 15 * 60_000;
  assert.equal(store.get("alice"), undefined);
});

test("disconnect and new pairing invalidate an in-flight verification", () => {
  const store = createVkPhotoTestConnection();
  const first = store.consume(store.start("alice")!)!;
  store.clear("alice");
  assert.equal(store.set(first, "secret"), false);
  const older = store.consume(store.start("alice")!)!;
  const newer = store.consume(store.start("alice")!)!;
  assert.equal(store.set(older, "older"), false);
  assert.equal(store.set(newer, "newer"), true);
  assert.equal(store.set(newer, "again"), false);
  assert.equal(store.get("alice"), "newer");
});
