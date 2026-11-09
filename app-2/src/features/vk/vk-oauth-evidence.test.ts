import assert from "node:assert/strict";
import test from "node:test";

import { oauthEvidence } from "./vk-oauth-evidence.js";

test("OAuth evidence distinguishes absent grants and never persists credentials or arbitrary provider fields", () => {
  const result = oauthEvidence(
    {
      access_token: "private-access",
      refresh_token: "private-refresh",
      code: "private-code",
      state: "private-state",
      device_id: "private-device",
      error_description: "private-error",
      expires_in: 86400,
      scope: "email photos private-scope",
    },
    200,
    "authorization_code",
  );
  assert.deepEqual(result.scopes, ["email", "photos"]);
  assert.equal(result.unrecognizedScopeCount, 1);
  assert.equal(result.refreshTokenPresent, true);
  assert.equal(result.expiresIn, 86400);
  assert.ok(!JSON.stringify(result).includes("private"));
  const missing = oauthEvidence(
    { error: "invalid_grant" },
    400,
    "refresh_token",
  );
  assert.equal(missing.scopes, null);
  assert.equal(missing.expiresIn, null);
  assert.equal(missing.refreshTokenPresent, false);
});
