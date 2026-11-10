import assert from "node:assert/strict";
import test from "node:test";

import {
  createVkPhotoPreparation,
  preparationKey,
} from "./vk-photo-preparation.js";

const storage = () => {
  const rows = new Map<string, { value: unknown; updatedAt: Date }>();
  const database = {
    client: {
      appSetting: {
        findUnique: async ({ where }: any) => rows.get(where.key) ?? null,
        create: async ({ data }: any) => {
          if (rows.has(data.key))
            throw Object.assign(new Error("unique"), { code: "P2002" });
          rows.set(data.key, { value: data.value, updatedAt: new Date() });
        },
        upsert: async ({ where, create, update }: any) => {
          rows.set(where.key, {
            value: rows.has(where.key) ? update.value : create.value,
            updatedAt: new Date(),
          });
        },
        deleteMany: async ({ where }: any) => {
          const row = rows.get(where.key);
          if (
            row &&
            (!where.updatedAt || row.updatedAt < where.updatedAt.lt) &&
            (!where.value ||
              JSON.stringify(row.value) === JSON.stringify(where.value.equals))
          )
            rows.delete(where.key);
        },
      },
    },
  };
  return { rows, database: database as never };
};
const image = { id: "media-a", objectId: "immutable-object-a" };

test("prepared photos survive service restart and expired upload credentials", async () => {
  const { database } = storage();
  let uploads = 0;
  const first = createVkPhotoPreparation({
    database,
    groupId: "123",
    upload: async () => {
      uploads++;
      return "photo-123_77";
    },
  });
  await Promise.all([first.prepare(image), first.prepare(image)]);
  const restarted = createVkPhotoPreparation({
    database,
    groupId: "123",
    upload: async () => {
      throw new Error("expired");
    },
  });
  assert.equal(await restarted.prepare(image), "photo-123_77");
  assert.equal(uploads, 1);
  assert.equal((await restarted.inspect(image)).ready, true);
});

test("replaced images and a different community cannot reuse the wrong attachment", async () => {
  assert.notEqual(preparationKey("123", image), preparationKey("124", image));
  assert.notEqual(
    preparationKey("123", image),
    preparationKey("123", { ...image, objectId: "replacement" }),
  );
});

test("a cached user-album attachment is replaced before a community post", async () => {
  const { database, rows } = storage();
  rows.set(preparationKey("123", image), {
    value: {
      attachment: "photo999_77_deadbeef",
      preparedAt: new Date().toISOString(),
    },
    updatedAt: new Date(),
  });
  let uploads = 0;
  const service = createVkPhotoPreparation({
    database,
    groupId: "123",
    upload: async () => {
      uploads++;
      return "photo-123_88";
    },
  });
  assert.equal(await service.prepare(image), "photo-123_88");
  assert.equal(uploads, 1);
  assert.equal((await service.inspect(image)).ready, true);
});

test("partial batch persists successful images and retries failed ones", async () => {
  const { database } = storage();
  let fail = true;
  const service = createVkPhotoPreparation({
    database,
    groupId: "123",
    upload: async (id) => {
      if (id === "b" && fail)
        throw new Error("expired secret must not be saved");
      return "photo-123_77";
    },
  });
  const b = { id: "b", objectId: "b" };
  await service.prepare(image);
  await assert.rejects(service.prepare(b));
  assert.equal((await service.inspect(image)).ready, true);
  assert.equal((await service.inspect(b)).ready, false);
  assert.doesNotMatch((await service.inspect(b)).error!, /secret/);
  fail = false;
  await service.prepare(b);
  assert.equal((await service.inspect(b)).ready, true);
});

test("a second worker cannot race the same upload and stale leases recover", async () => {
  const { database, rows } = storage();
  const lock = `${preparationKey("123", image)}.lease`;
  rows.set(lock, { value: { lease: "other-worker" }, updatedAt: new Date() });
  let calls = 0;
  const service = createVkPhotoPreparation({
    database,
    groupId: "123",
    upload: async () => {
      calls++;
      return "photo-123_77";
    },
  });
  await assert.rejects(service.prepare(image), { code: "VK_PHOTOS_PREPARING" });
  assert.equal(calls, 0);
  rows.set(lock, {
    value: { lease: "crashed-worker" },
    updatedAt: new Date(0),
  });
  await service.prepare(image);
  assert.equal(calls, 1);
});

test("native wall-upload provenance preserves user-owned saved photos across restart", async () => {
  const { database, rows } = storage();
  let uploads = 0;
  const service = createVkPhotoPreparation({
    database,
    groupId: "123",
    upload: async () => {
      uploads++;
      return "photo999_88_nativekey";
    },
  });
  assert.equal(await service.prepare(image), "photo999_88_nativekey");
  assert.equal((await service.inspect(image)).ready, true);
  const restarted = createVkPhotoPreparation({
    database,
    groupId: "123",
    upload: async () => {
      throw new Error("expired");
    },
  });
  assert.equal(await restarted.prepare(image), "photo999_88_nativekey");
  assert.equal(uploads, 1);
  assert.equal(
    (rows.get(preparationKey("123", image))!.value as any).kind,
    "wall",
  );
});

test("a successful retry removes the old failure; diagnostics contain only safe labels", async () => {
  const { database, rows } = storage();
  const { VkApiError } = await import("../vk/vk.client.js");
  let fail = true;
  const service = createVkPhotoPreparation({
    database,
    groupId: "123",
    upload: async () => {
      if (fail) {
        const error = new VkApiError(15, "private-secret-upload-url");
        error.method = "photos.saveWallPhoto";
        throw error;
      }
      return "photo999_88_nativekey";
    },
  });
  await assert.rejects(service.prepare(image));
  const state = await service.inspect(image);
  assert.equal(state.code, "VK_15");
  assert.equal(state.method, "photos.saveWallPhoto");
  assert.doesNotMatch(JSON.stringify([...rows.values()]), /private-secret/);
  fail = false;
  await service.prepare(image);
  assert.equal((await service.inspect(image)).ready, true);
  assert.equal(rows.has(`${preparationKey("123", image)}.failure`), false);
});

test("production requires community ownership and a different album cache never reuses old wall attachments", async () => {
  const { database } = storage();
  const native = createVkPhotoPreparation({
    database,
    groupId: "123",
    upload: async () => "photo-123_1",
  });
  await native.prepare(image);
  const album = createVkPhotoPreparation({
    database,
    groupId: "123",
    keyPrefix: "album.7.",
    requireCommunityOwner: true,
    upload: async () => "photo-123_2",
  });
  assert.equal((await album.inspect(image)).ready, false);
  assert.equal(await album.prepare(image), "photo-123_2");
  const wrong = createVkPhotoPreparation({
    database,
    groupId: "123",
    keyPrefix: "album.8.",
    requireCommunityOwner: true,
    upload: async () => "photo999_88",
  });
  await assert.rejects(wrong.prepare(image), {
    code: "VK_COMMUNITY_ALBUM_REQUIRED",
  });
  assert.equal((await wrong.inspect(image)).ready, false);
});
