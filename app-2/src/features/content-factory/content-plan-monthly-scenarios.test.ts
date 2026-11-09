import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test, { type TestContext } from "node:test";
import { setTimeout as pause } from "node:timers/promises";
import pino from "pino";

import { VkApiError } from "../vk/vk.client.js";
import { createContentPlanPublishingService } from "./content-plan-publishing.service.js";
import { createContentPlanRepository } from "./content-plan.repository.js";

const jpeg = readFileSync(
  new URL("./assets/vk-test-photo.jpg", import.meta.url),
);
const waitUntil = async (condition: () => boolean) => {
  for (let i = 0; i < 500; i++) {
    if (condition()) return;
    await pause(5);
  }
  assert.ok(condition(), "background work did not settle");
};
type Post = {
  id: string;
  channel: string;
  status: string;
  scheduledDate: Date;
  scheduledTime: string;
  imageIds: string[];
  imageStatus: string;
  generatedCopy: string;
  [key: string]: unknown;
};

const harness = (context: TestContext) => {
  context.mock.timers.enable({
    apis: ["Date", "setInterval"],
    now: Date.parse("2026-11-01T00:00:00Z"),
  });
  const posts: Post[] = [];
  const settings = new Map<string, { value: unknown; updatedAt: Date }>();
  const media = new Map<
    string,
    {
      id: string;
      objectId: string;
      contentType: string;
      fileName: string;
      sizeBytes: number;
    }
  >();
  const uploads: string[] = [];
  const deliveries: { id: string; attachments: string[]; text: string }[] = [];
  let activeToken = true;
  let blockPublishing = false;
  let loseResponse = false;
  let checks = 0;
  const matches = (post: Post, where: any): boolean => {
    if (where.id && post.id !== where.id) return false;
    if (where.channel && post.channel !== where.channel) return false;
    if (typeof where.status === "string" && post.status !== where.status)
      return false;
    if (where.status?.in && !where.status.in.includes(post.status))
      return false;
    if (
      where.publicationAttemptedAt &&
      !(
        post.publicationAttemptedAt instanceof Date &&
        post.publicationAttemptedAt < where.publicationAttemptedAt.lt
      )
    )
      return false;
    if (
      where.OR &&
      !where.OR.some((rule: any) =>
        rule.scheduledDate?.lt
          ? post.scheduledDate < rule.scheduledDate.lt
          : +post.scheduledDate === +rule.scheduledDate &&
            post.scheduledTime <= rule.scheduledTime.lte,
      )
    )
      return false;
    return true;
  };
  const database = {
    client: {
      appSetting: {
        findUnique: async ({ where }: any) => settings.get(where.key) ?? null,
        create: async ({ data }: any) => {
          if (settings.has(data.key))
            throw Object.assign(new Error("unique"), { code: "P2002" });
          settings.set(data.key, { value: data.value, updatedAt: new Date() });
        },
        upsert: async ({ where, create, update }: any) => {
          settings.set(where.key, {
            value: settings.has(where.key) ? update.value : create.value,
            updatedAt: new Date(),
          });
        },
        deleteMany: async ({ where }: any) => {
          const row = settings.get(where.key);
          if (
            row &&
            (!where.updatedAt || row.updatedAt < where.updatedAt.lt) &&
            (!where.value ||
              JSON.stringify(row.value) === JSON.stringify(where.value.equals))
          )
            settings.delete(where.key);
        },
      },
      contentFactoryMedia: {
        findMany: async ({ where }: any) =>
          where.id.in.flatMap((id: string) =>
            media.has(id) ? [media.get(id)] : [],
          ),
      },
      contentPlanPost: {
        findUnique: async ({ where }: any) =>
          posts.find((post) => post.id === where.id) ?? null,
        findMany: async ({ where }: any) => {
          checks++;
          return posts.filter((post) => matches(post, where));
        },
        updateMany: async ({ where, data }: any) => {
          let count = 0;
          for (const post of posts)
            if (matches(post, where)) {
              Object.assign(post, data);
              count++;
            }
          return { count };
        },
      },
    },
  } as never;
  const vk = {
    configured: true,
    verifyCredentials: async () => {},
    verifyPublishingRights: async () => {
      if (blockPublishing) throw new VkApiError(27, "wall permission revoked");
    },
    publishWallPost: async (input: any) => {
      assert.equal(input.prepareOnly, true);
      assert.equal(input.groupId, "138003065");
      if (!activeToken)
        throw new VkApiError(5, "VK photo upload access token has expired");
      uploads.push(input.idempotencyKey.replace("prepare-", ""));
      input.onPreparedAttachments([`photo-138003065_${uploads.length}`]);
      return { externalId: "", url: "" };
    },
    publishPreparedWallPost: async (input: any) => {
      assert.equal(input.groupId, "138003065");
      assert.ok(
        input.attachments.length ||
          !posts.find((post) => post.id === input.idempotencyKey)?.imageIds
            .length,
      );
      deliveries.push({
        id: input.idempotencyKey,
        attachments: [...input.attachments],
        text: input.text,
      });
      if (loseResponse) throw new TypeError("Connection lost after wall.post");
      return {
        externalId: String(deliveries.length),
        url: `https://vk.com/wall-138003065_${deliveries.length}`,
      };
    },
  } as never;
  const options = {
    database,
    enabled: true,
    instagram: {} as never,
    logger: pino({ level: "silent" }),
    managedStorage: {
      getDownload: async () => ({
        downloadUrl: "https://storage.example/photo",
      }),
    } as never,
    max: {} as never,
    telegram: {} as never,
    vk,
    vkGroupId: "138003065",
  };
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(jpeg)) as typeof fetch;
  context.after(() => {
    stop();
    globalThis.fetch = realFetch;
    context.mock.timers.reset();
  });
  let service = createContentPlanPublishingService(options);
  let stop = () => {};
  const add = (id: string, day: number, imageId = id) => {
    media.set(imageId, {
      id: imageId,
      objectId: `object-${imageId}`,
      contentType: "image/jpeg",
      fileName: "photo.jpg",
      sizeBytes: jpeg.length,
    });
    const post: Post = {
      id,
      channel: "vk",
      status: "needs_review",
      scheduledDate: new Date(
        `2026-11-${String(day).padStart(2, "0")}T00:00:00Z`,
      ),
      scheduledTime: "12:00",
      imageIds: [imageId],
      imageStatus: "completed",
      generatedCopy: `Post ${id}`,
    };
    posts.push(post);
    return post;
  };
  const cycle = async () => {
    const before = checks;
    context.mock.timers.tick(30_000);
    await waitUntil(() => checks > before);
    await pause(40);
  };
  return {
    posts,
    media,
    uploads,
    deliveries,
    add,
    database,
    options,
    get service() {
      return service;
    },
    expire: () => {
      activeToken = false;
    },
    reconnect: () => {
      activeToken = true;
    },
    loseResponse: () => {
      loseResponse = true;
    },
    revokeWall: () => {
      blockPublishing = true;
    },
    start: async () => {
      stop = service.startProductionScheduler();
      await pause(40);
    },
    restart: async () => {
      stop();
      service = createContentPlanPublishingService(options);
      stop = service.startProductionScheduler();
      await pause(40);
    },
    cycle,
    time: (value: string) => context.mock.timers.setTime(Date.parse(value)),
  };
};

test("30-day plan prepares in batches, publishes at Moscow times after photo token expires and survives restart without duplicates", async (context) => {
  const h = harness(context);
  for (let day = 1; day <= 30; day++) h.add(`day-${day}`, day);
  await h.start();
  await waitUntil(() => h.uploads.length === 10);
  await h.cycle();
  await waitUntil(() => h.uploads.length === 20);
  await h.cycle();
  await waitUntil(() => h.uploads.length === 30);
  for (const post of h.posts) {
    post.status = "approved";
    await h.service.schedulePost(post.id);
  }
  h.expire();
  for (let day = 1; day <= 30; day++) {
    const date = `2026-11-${String(day).padStart(2, "0")}`;
    h.time(`${date}T08:59:00Z`);
    await h.cycle();
    assert.equal(h.deliveries.length, day - 1, "must not publish early");
    h.time(`${date}T09:00:00Z`);
    await h.cycle();
    assert.equal(h.deliveries.length, day);
    assert.equal(h.posts[day - 1]!.status, "published");
    if (day === 15) await h.restart();
  }
  await h.restart();
  await h.cycle();
  assert.equal(h.deliveries.length, 30);
  assert.equal(new Set(h.deliveries.map((item) => item.id)).size, 30);
  assert.equal(h.uploads.length, 30, "expired token must not trigger reupload");
});

test("mid-month additions wait for renewed token; old scheduled photos remain ready; replacement and text-only edits use correct images", async (context) => {
  const h = harness(context);
  const old = h.add("original", 25);
  await h.start();
  await waitUntil(() => h.uploads.length === 1);
  old.status = "approved";
  await h.service.schedulePost(old.id);
  h.expire();
  h.time("2026-11-15T00:00:00Z");
  const added = h.add("added", 26);
  await h.cycle();
  added.status = "approved";
  await assert.rejects(h.service.schedulePost(added.id), {
    code: "VK_PHOTOS_NOT_PREPARED",
  });
  assert.equal(old.status, "scheduled");
  assert.equal((await h.service.photoPreparationStatus()).ready, 1);
  h.reconnect();
  h.time("2026-11-15T00:02:00Z");
  await h.cycle();
  await waitUntil(() => h.uploads.length === 2);
  await h.service.schedulePost(added.id);
  const edited = h.add("edited", 27, "original");
  const repository = createContentPlanRepository(h.database);
  await repository.updateReviewPost(edited.id, { text: "Updated text" });
  await h.cycle();
  assert.equal(h.uploads.length, 2, "text editing reuses photo");
  h.media.set("replacement", {
    id: "replacement",
    objectId: "new-object",
    contentType: "image/jpeg",
    fileName: "new.jpg",
    sizeBytes: jpeg.length,
  });
  await repository.updateReviewPost(edited.id, { imageIds: ["replacement"] });
  edited.status = "approved";
  h.expire();
  await assert.rejects(h.service.schedulePost(edited.id), {
    code: "VK_PHOTOS_NOT_PREPARED",
  });
  h.reconnect();
  await h.cycle();
  await waitUntil(() => h.uploads.length === 3);
  await h.service.schedulePost(edited.id);
  h.expire();
  await h.restart();
  h.time("2026-11-27T09:00:00Z");
  await h.cycle();
  await waitUntil(() => h.deliveries.length === 3);
  assert.deepEqual(
    h.deliveries.map((item) => item.attachments),
    [["photo-138003065_1"], ["photo-138003065_2"], ["photo-138003065_3"]],
  );
  assert.equal(h.deliveries[2]!.text, "Updated text");
});

test("drafts, cancelled and future posts do not publish; deleted media or revoked community permission blocks delivery", async (context) => {
  const h = harness(context);
  const draft = h.add("draft", 5);
  const cancelled = h.add("cancelled", 5);
  cancelled.status = "cancelled";
  const future = h.add("future", 20);
  await h.start();
  await waitUntil(() => h.uploads.length === 2);
  future.status = "approved";
  await h.service.schedulePost(future.id);
  h.time("2026-11-10T09:00:00Z");
  await h.cycle();
  assert.equal(h.deliveries.length, 0);
  assert.equal(draft.status, "needs_review");
  h.revokeWall();
  h.time("2026-11-20T09:00:00Z");
  await h.cycle();
  await waitUntil(() => future.status === "publish_failed");
  assert.equal(h.deliveries.length, 0);
  const deleted = h.add("deleted", 25);
  h.media.delete("deleted");
  deleted.status = "approved";
  // Use a fresh client with community permission restored to reach photo validation.
  const service = createContentPlanPublishingService({
    ...h.options,
    vk: Object.assign({}, h.options.vk, {
      verifyPublishingRights: async () => {},
    }) as never,
  });
  await assert.rejects(service.schedulePost(deleted.id), {
    code: "VK_PHOTO_MISSING",
  });
});

test("readiness includes posts still queued or generating instead of claiming the whole plan is ready", async (context) => {
  const h = harness(context);
  const queued = h.add("queued", 25);
  queued.status = "queued";
  queued.imageIds = [];
  const generating = h.add("generating", 26);
  generating.status = "generating";
  generating.imageIds = [];
  const ready = h.add("ready", 27);
  await h.start();
  await waitUntil(() => h.uploads.length === 1);
  let state = await h.service.photoPreparationStatus();
  assert.equal(state.generatingPosts, 2);
  assert.equal(state.ready, 1);
  queued.status = "needs_review";
  queued.imageIds = ["queued"];
  generating.status = "needs_review";
  generating.imageIds = ["generating"];
  await h.cycle();
  await waitUntil(() => h.uploads.length === 3);
  state = await h.service.photoPreparationStatus();
  assert.equal(state.generatingPosts, 0);
  assert.equal(state.ready, 3);
  assert.equal(ready.status, "needs_review");
});

test("lost publication response is marked unknown and is never retried automatically after restart", async (context) => {
  const h = harness(context);
  const post = h.add("uncertain", 1);
  await h.start();
  await waitUntil(() => h.uploads.length === 1);
  post.status = "approved";
  await h.service.schedulePost(post.id);
  h.expire();
  h.loseResponse();
  h.time("2026-11-01T09:00:00Z");
  await h.cycle();
  await waitUntil(() => post.status === "publish_unknown");
  await h.restart();
  await h.cycle();
  assert.equal(h.deliveries.length, 1);
});

test("intentional text-only post does not need photo access", async (context) => {
  const h = harness(context);
  const post = h.add("text-only", 1);
  post.imageIds = [];
  post.status = "approved";
  h.expire();
  await h.start();
  await h.service.schedulePost(post.id);
  h.time("2026-11-01T09:00:00Z");
  await h.cycle();
  await waitUntil(() => post.status === "published");
  assert.equal(h.uploads.length, 0);
  assert.deepEqual(h.deliveries[0]!.attachments, []);
});
