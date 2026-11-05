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
  assert.equal(store.set(pair.adminId, "secret", pair.expiresAt), true);
  assert.equal(store.get("alice"), "secret");
  assert.equal(store.get("bob"), undefined);
  store.clear("alice");
  assert.equal(store.get("alice"), undefined);
  const expiredCode = store.start("alice")!;
  time += 5 * 60_000;
  assert.equal(store.consume(expiredCode), null);
  const code2 = store.start("alice")!;
  const pair2 = store.consume(code2)!;
  store.set("alice", "secret", pair2.expiresAt);
  time += 15 * 60_000;
  assert.equal(store.get("alice"), undefined);
});
