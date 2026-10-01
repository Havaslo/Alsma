import assert from "node:assert/strict";
import test from "node:test";

import { pushSubscriptionBodySchema } from "./admin-push.schemas.js";

const subscriptionFor = (endpoint: string) => ({
  endpoint,
  keys: { auth: "auth-key", p256dh: "public-key" },
});

test("accepts HTTPS endpoints from supported browser push services", () => {
  for (const endpoint of [
    "https://fcm.googleapis.com/fcm/send/subscription-token",
    "https://updates.push.services.mozilla.com/wpush/v2/token",
    "https://web.push.apple.com/QWERTY",
  ]) {
    assert.equal(
      pushSubscriptionBodySchema.safeParse(subscriptionFor(endpoint)).success,
      true,
    );
  }
});

test("rejects insecure or unrelated push endpoints", () => {
  for (const endpoint of [
    "http://fcm.googleapis.com/fcm/send/token",
    "https://example.com/push/token",
    "https://127.0.0.1/private",
    "https://fcm.googleapis.com:8443/fcm/send/token",
    "https://user@fcm.googleapis.com/fcm/send/token",
  ]) {
    assert.equal(
      pushSubscriptionBodySchema.safeParse(subscriptionFor(endpoint)).success,
      false,
    );
  }
});
