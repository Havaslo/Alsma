import assert from "node:assert/strict";
import test from "node:test";
import pino from "pino";

import { createContentPlanPublishingService } from "./content-plan-publishing.service.js";
import { preparationKey } from "./vk-photo-preparation.js";

const image = { id: "photo-id", objectId: "object-id" };
const groupId = "177090031";

const createService = (imageIds: string[], preparedAttachment?: string) => {
  let queued = false;
  let mediaReads = 0;
  let photoChecks = 0;
  const post = {
    channel: "vk",
    generatedCopy: "Проверенный текст",
    id: "post-id",
    imageIds,
    scheduledDate: new Date("2099-01-01T00:00:00.000Z"),
    scheduledTime: "12:00",
    status: "approved",
  };
  const prepared = new Map<string, unknown>();
  if (preparedAttachment)
    prepared.set(preparationKey(groupId, image), {
      attachment: preparedAttachment,
      preparedAt: new Date().toISOString(),
    });
  const service = createContentPlanPublishingService({
    database: {
      client: {
        appSetting: {
          findUnique: async ({ where }: { where: { key: string } }) => {
            const value = prepared.get(where.key);
            return value ? { key: where.key, value } : null;
          },
        },
        contentFactoryMedia: {
          findMany: async () => {
            mediaReads += 1;
            return [
              {
                contentType: "image/jpeg",
                fileName: "photo.jpg",
                id: image.id,
                objectId: image.objectId,
                sizeBytes: 100,
              },
            ];
          },
        },
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
        photoChecks += 1;
      },
    } as never,
    vkGroupId: groupId,
  });
  return {
    service,
    wasQueued: () => queued,
    mediaReads: () => mediaReads,
    photoChecks: () => photoChecks,
  };
};

test("VK photo post is not queued until its photo is prepared", async () => {
  const { service, wasQueued, photoChecks } = createService(["photo-id"]);
  await assert.rejects(service.schedulePost("post-id"), {
    code: "VK_PHOTOS_NOT_PREPARED",
    status: 409,
  });
  assert.equal(wasQueued(), false);
  assert.equal(photoChecks(), 0);
});

test("a user-album attachment is not accepted as a prepared community photo", async () => {
  const { service, wasQueued } = createService(
    ["photo-id"],
    "photo999_11_deadbeef",
  );
  await assert.rejects(service.schedulePost("post-id"), {
    code: "VK_PHOTOS_NOT_PREPARED",
    status: 409,
  });
  assert.equal(wasQueued(), false);
});

test("VK photo post is queued when the prepared community photo exists", async () => {
  const { service, wasQueued, photoChecks } = createService(
    ["photo-id"],
    "photo-177090031_11",
  );
  await service.schedulePost("post-id");
  assert.equal(wasQueued(), true);
  assert.equal(photoChecks(), 0);
});

test("VK text-only posts are queued without reading photo preparation", async () => {
  const { service, wasQueued, mediaReads } = createService([]);
  await service.schedulePost("post-id");
  assert.equal(wasQueued(), true);
  assert.equal(mediaReads(), 0);
});
