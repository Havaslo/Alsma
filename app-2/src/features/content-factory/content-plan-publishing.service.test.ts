import assert from "node:assert/strict";
import test from "node:test";
import pino from "pino";

import { TelegramApiError } from "../telegram/telegram-bot.client.js";
import { createContentPlanPublishingService } from "./content-plan-publishing.service.js";
import { getMoscowDateTime } from "./content-plan-time.js";

test("publishing schedule is unavailable outside production", async () => {
  const service = createContentPlanPublishingService({
    database: {} as never,
    enabled: false,
    instagram: {
      status: async () => ({ connected: false }),
    } as never,
    logger: pino({ level: "silent" }),
    managedStorage: {} as never,
    max: {} as never,
    telegram: {} as never,
    vk: {} as never,
  });

  assert.equal((await service.channelStatus()).enabled, false);
  assert.deepEqual((await service.channelStatus()).blog, { configured: true });
  assert.deepEqual((await service.channelStatus()).instagram, {
    configured: false,
  });
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

test("Zen scheduling queues through the verified Telegram destination", async () => {
  let scheduledPost: {
    channel: string;
    generatedCopy: string;
    id: string;
    imageIds: string[];
    scheduledDate: Date;
    scheduledTime: string;
    status: string;
  } = {
    channel: "zen",
    generatedCopy: "Короткий тестовый текст",
    id: "post-id",
    imageIds: [],
    scheduledDate: new Date("2099-01-01T00:00:00.000Z"),
    scheduledTime: "12:00",
    status: "approved",
  };
  let scheduledChannel: string | undefined;
  let verifiedTarget = false;
  const database = {
    client: {
      contentPlanPost: {
        findUnique: async () => scheduledPost,
        updateMany: async (input: { data: { channel?: string } }) => {
          scheduledChannel = input.data.channel;
          if (input.data.channel)
            scheduledPost = { ...scheduledPost, channel: input.data.channel };
          return { count: 1 };
        },
      },
    },
  } as never;
  const service = createContentPlanPublishingService({
    database,
    enabled: true,
    instagram: {
      status: async () => ({ connected: false }),
    } as never,
    logger: pino({ level: "silent" }),
    managedStorage: {} as never,
    max: {} as never,
    telegram: {
      configured: true,
      verifyChannelPublishing: async (target: string) => {
        verifiedTarget = target === "@alsma_bazann";
      },
    } as never,
    telegramPublishChatId: "@alsma_bazann",
    vk: {} as never,
  });

  const scheduled = await service.schedulePost("post-id");

  assert.equal(verifiedTarget, true);
  assert.equal(scheduledChannel, "telegram");
  assert.equal(scheduled.channel, "telegram");
});

test("Telegram verification outages return a safe actionable error", async () => {
  const post = {
    channel: "telegram",
    generatedCopy: "Короткий тестовый текст",
    id: "post-id",
    imageIds: [],
    scheduledDate: new Date("2099-01-01T00:00:00.000Z"),
    scheduledTime: "12:00",
    status: "approved",
  };
  const database = {
    client: { contentPlanPost: { findUnique: async () => post } },
  } as never;
  const service = createContentPlanPublishingService({
    database,
    enabled: true,
    instagram: {
      status: async () => ({ connected: false }),
    } as never,
    logger: pino({ level: "silent" }),
    managedStorage: {} as never,
    max: {} as never,
    telegram: {
      configured: true,
      verifyChannelPublishing: async () => {
        throw new TelegramApiError(503);
      },
    } as never,
    telegramPublishChatId: "@alsma_bazann",
    vk: {} as never,
  });

  await assert.rejects(service.schedulePost("post-id"), {
    code: "TELEGRAM_VERIFICATION_FAILED",
    status: 502,
  });
});
