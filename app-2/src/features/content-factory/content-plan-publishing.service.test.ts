import assert from "node:assert/strict";
import test from "node:test";
import pino from "pino";

import {
  createContentPlanPublishingService,
  getMoscowDateTime,
} from "./content-plan-publishing.service.js";

test("publishing schedule is unavailable outside production", async () => {
  const service = createContentPlanPublishingService({
    database: {} as never,
    enabled: false,
    logger: pino({ level: "silent" }),
    managedStorage: {} as never,
    max: {} as never,
    vk: {} as never,
  });

  assert.equal(service.channelStatus().enabled, false);
  await assert.rejects(service.schedulePost("post-id"), {
    code: "CONTENT_PLAN_PUBLISHING_DISABLED",
    status: 409,
  });
});

test("Moscow date and time are derived in the configured publication zone", () => {
  assert.deepEqual(getMoscowDateTime(new Date("2026-10-09T09:00:00.000Z")), {
    date: "2026-10-09",
    time: "12:00",
  });
});
