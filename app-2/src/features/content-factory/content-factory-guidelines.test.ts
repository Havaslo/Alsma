import assert from "node:assert/strict";
import { test } from "node:test";

import {
  contentFactoryChannelGuidelines,
  getContentFactoryChannelGuideline,
  normalizeContentChannelId,
} from "./content-factory-guidelines.js";

test("Telegram and Zen share one editor profile", () => {
  const ids = contentFactoryChannelGuidelines.map(({ id }) => id);

  assert.deepEqual(ids, ["vk", "telegram", "max", "instagram", "blog"]);
  assert.equal(
    getContentFactoryChannelGuideline("telegram").label,
    "Telegram\\Дзен",
  );
  assert.equal(normalizeContentChannelId("zen"), "telegram");
  assert.equal(getContentFactoryChannelGuideline("zen").id, "telegram");
  assert.equal(
    getContentFactoryChannelGuideline("telegram").image.ratio,
    "1:1",
  );
});
