import assert from "node:assert/strict";
import test from "node:test";

import {
  disabledRenewal,
  restoreRenewal,
  shouldRenew,
} from "../src/lib/content-factory/vkBrowserRenewal.ts";

const now = Date.parse("2026-11-09T12:00:00Z");
const active = { ...disabledRenewal(), enabled: true, verified: true };
const status = {
  configured: true,
  expiresAt: new Date(now + 600000).toISOString(),
};
test("requires a successful callback for a recent initiated attempt", () => {
  const pending = { ...active, verified: false, pendingAt: now - 1000 };
  for (const outcome of [null, "INVALID_STATE", "AUTHORIZATION_DENIED"])
    assert.equal(
      restoreRenewal(JSON.stringify(pending), outcome, now).enabled,
      false,
    );
  assert.equal(
    restoreRenewal(JSON.stringify(pending), "CONNECTED", now).verified,
    true,
  );
  assert.equal(
    restoreRenewal(
      JSON.stringify({ ...pending, pendingAt: now - 600001 }),
      "CONNECTED",
      now,
    ).enabled,
    false,
  );
  assert.equal(restoreRenewal(null, "CONNECTED", now).enabled, false);
});
test("renew near expiry, but never loop or duplicate server refresh", () => {
  assert.equal(shouldRenew(active, status, now), true);
  assert.equal(
    shouldRenew({ ...active, attemptedExpiry: status.expiresAt }, status, now),
    false,
  );
  assert.equal(shouldRenew({ ...active, pendingAt: now }, status, now), false);
  assert.equal(shouldRenew({ ...active, verified: false }, status, now), false);
  assert.equal(
    shouldRenew(active, { ...status, vkId: { autoRenewal: true } }, now),
    false,
  );
  assert.equal(shouldRenew(active, { ...status, expiresAt: null }, now), false);
  assert.equal(
    shouldRenew(active, { ...status, expiresAt: "broken" }, now),
    false,
  );
  assert.equal(
    shouldRenew(
      active,
      { ...status, expiresAt: new Date(now + 3600000).toISOString() },
      now,
    ),
    false,
  );
  assert.equal(
    shouldRenew(
      active,
      { ...status, expiresAt: new Date(now - 1000).toISOString() },
      now,
    ),
    true,
  );
});
