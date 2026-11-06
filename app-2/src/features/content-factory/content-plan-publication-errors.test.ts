import assert from "node:assert/strict";
import test from "node:test";

import { MaxImageUploadError } from "../max-bot/max-bot.client.js";
import { VkApiError } from "../vk/vk.client.js";
import { safePublicationError } from "./content-plan-publication-errors.js";

test("MAX upload errors do not incorrectly blame the media library", () => {
  assert.match(safePublicationError(new MaxImageUploadError(), false), /MAX/u);
  assert.doesNotMatch(
    safePublicationError(new MaxImageUploadError(), false),
    /медиатек/u,
  );
  assert.doesNotMatch(
    safePublicationError(new Error("other"), false),
    /медиатек/u,
  );
});

test("VK IP binding and non-standalone errors have different remediation", () => {
  const ip = safePublicationError(
    new VkApiError(
      5,
      "VK photo upload access was denied: access_token was given to another ip address SECRET",
    ),
    false,
  );
  assert.match(ip, /IP/u);
  assert.doesNotMatch(ip, /SECRET/u);
  const application = safePublicationError(
    new VkApiError(15, "non-standalone applications SECRET", 1134),
    false,
  );
  assert.match(application, /15\/1134/u);
  assert.match(application, /ключ сообщества/u);
  assert.doesNotMatch(application, /SECRET/u);
});
