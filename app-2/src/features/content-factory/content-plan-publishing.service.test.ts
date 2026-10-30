import assert from "node:assert/strict";
import test from "node:test";
import pino from "pino";

import { MaxApiError } from "../max-bot/max-bot.client.js";
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

const maxPost = {
  channel: "max",
  generatedCopy: "Короткий тестовый текст",
  id: "post-id",
  imageIds: [],
  scheduledDate: new Date("2099-01-01T00:00:00.000Z"),
  scheduledTime: "12:00",
  status: "approved",
};

const maxDatabase = (discoveredChatId: string | null) =>
  ({
    client: {
      appSetting: {
        findUnique: async () =>
          discoveredChatId ? { value: { chatId: discoveredChatId } } : null,
      },
      contentPlanPost: {
        findUnique: async () => maxPost,
        updateMany: async () => ({ count: 1 }),
      },
    },
  }) as never;

test("MAX scheduling uses the channel reported through bot_added", async () => {
  const verified: string[] = [];
  const service = createContentPlanPublishingService({
    database: maxDatabase("555000111"),
    enabled: true,
    instagram: { status: async () => ({ connected: false }) } as never,
    logger: pino({ level: "silent" }),
    managedStorage: {} as never,
    max: {
      configured: true,
      verifyChannelPublishing: async (chatId: string) => {
        verified.push(chatId);
        if (chatId === "77312180004937")
          throw new MaxApiError(404, "chat.not.found");
        return { title: "Альсма" };
      },
    } as never,
    maxPublishChatId: "77312180004937",
    telegram: {} as never,
    vk: {} as never,
  });

  const scheduled = await service.schedulePost("post-id");

  assert.deepEqual(verified, ["77312180004937", "555000111"]);
  assert.equal(scheduled.channel, "max");
});

test("MAX scheduling reports an unknown channel instead of a network failure", async () => {
  const service = createContentPlanPublishingService({
    database: maxDatabase(null),
    enabled: true,
    instagram: { status: async () => ({ connected: false }) } as never,
    logger: pino({ level: "silent" }),
    managedStorage: {} as never,
    max: {
      configured: true,
      verifyChannelPublishing: async () => {
        throw new MaxApiError(404, "chat.not.found");
      },
    } as never,
    maxPublishChatId: "77312180004937",
    telegram: {} as never,
    vk: {} as never,
  });

  await assert.rejects(service.schedulePost("post-id"), {
    code: "MAX_PUBLISH_TARGET_NOT_FOUND",
    status: 409,
  });
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
