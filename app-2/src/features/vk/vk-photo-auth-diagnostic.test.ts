import assert from "node:assert/strict";
import test from "node:test";

import { photoAuthDiagnostic } from "./vk-photo-auth-diagnostic.js";
import { VkApiError } from "./vk.client.js";

test("VK photo errors yield safe diagnostic labels without disclosing credentials", () => {
  assert.equal(
    photoAuthDiagnostic(
      new VkApiError(
        5,
        "User authorization failed: access_token was given to another ip address. SECRET",
      ),
    ),
    "IP_MISMATCH",
  );
  assert.equal(
    photoAuthDiagnostic(new VkApiError(5, "invalid session")),
    "INVALID_SESSION",
  );
  assert.equal(
    photoAuthDiagnostic(new VkApiError(5, "access_token has expired")),
    "EXPIRED",
  );
  assert.equal(photoAuthDiagnostic(new VkApiError(5, "SECRET")), "AUTH_FAILED");
  assert.equal(
    photoAuthDiagnostic(
      new VkApiError(15, "access_token was given to another ip address"),
    ),
    "UNKNOWN",
  );
  assert.equal(photoAuthDiagnostic(new Error("SECRET")), "UNKNOWN");
});
