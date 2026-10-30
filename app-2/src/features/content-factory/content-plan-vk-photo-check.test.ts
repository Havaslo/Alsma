import assert from "node:assert/strict";
import test from "node:test";
import pino from "pino";

import { VkApiError } from "../vk/vk.client.js";
import { createContentPlanPublishingService } from "./content-plan-publishing.service.js";

const createService = (imageIds: string[], photoCheck: () => Promise<void>) => {
  let queued = false;
  let photoCheckCalls = 0;
  const post = {
    channel: "vk",
    generatedCopy: "Проверенный текст",
    id: "post-id",
    imageIds,
    scheduledDate: new Date("2099-01-01T00:00:00.000Z"),
    scheduledTime: "12:00",
    status: "approved",
  };
  const service = createContentPlanPublishingService({
    database: {
      client: {
        contentPlanPost: {
          findUnique: async () => post,
          updateMany: async () => {
            queued = true;
            return { count: 1 };
          },
        },
      },
    } as never,
    enabled: true,
    instagram: { status: async () => ({ connected: false }) } as never,
    logger: pino({ level: "silent" }),
    managedStorage: {} as never,
    max: {} as never,
    telegram: {} as never,
    vk: {
      configured: true,
      verifyCredentials: async () => undefined,
      verifyPublishingRights: async () => undefined,
      verifyWallPhotoUpload: async () => {
        photoCheckCalls += 1;
        await photoCheck();
      },
    } as never,
    vkGroupId: "177090031",
  });
  return {
    service,
    wasQueued: () => queued,
    photoChecks: () => photoCheckCalls,
  };
};

test("VK photo post is not queued when the wall-photo upload is denied", async () => {
  const { service, wasQueued, photoChecks } = createService(
    ["photo-id"],
    async () => {
      throw new VkApiError(27, "Group authorization failed");
    },
  );
  await assert.rejects(service.schedulePost("post-id"), {
    code: "VK_PHOTO_UPLOAD_PERMISSION_REQUIRED",
    status: 409,
  });
  assert.equal(photoChecks(), 1);
  assert.equal(wasQueued(), false);
});

test("VK photo preflight reports temporary failures without queueing", async () => {
  const { service, wasQueued } = createService(["photo-id"], async () => {
    throw new Error("network outage");
  });
  await assert.rejects(service.schedulePost("post-id"), {
    code: "VK_PHOTO_UPLOAD_CHECK_FAILED",
    status: 502,
  });
  assert.equal(wasQueued(), false);
});

test("VK text-only posts do not require a photo upload check", async () => {
  const { service, wasQueued, photoChecks } = createService([], async () => {
    throw new Error("should not be called");
  });
  await service.schedulePost("post-id");
  assert.equal(photoChecks(), 0);
  assert.equal(wasQueued(), true);
});

test("VK photo post can be queued when the upload address is available", async () => {
  const { service, wasQueued, photoChecks } = createService(
    ["photo-id"],
    async () => {},
  );
  await service.schedulePost("post-id");
  assert.equal(photoChecks(), 1);
  assert.equal(wasQueued(), true);
});
