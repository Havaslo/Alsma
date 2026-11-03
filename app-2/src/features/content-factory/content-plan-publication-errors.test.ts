import assert from "node:assert/strict";
import test from "node:test";

import { MaxImageUploadError } from "../max-bot/max-bot.client.js";
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
