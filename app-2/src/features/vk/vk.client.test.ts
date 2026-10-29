import assert from "node:assert/strict";
import test from "node:test";
import type { Logger } from "pino";

import { VkApiError, createVkClient } from "./vk.client.js";
import type { VkPublishingAccess } from "./vk.client.js";

const logger = {
  warn: () => undefined,
} as unknown as Logger;

const groupAuthDenial = {
  error: {
    error_code: 27,
    error_msg:
      "Group authorization failed: method is unavailable with group auth.",
  },
};

const withFetch = async (
  handler: (method: string) => unknown,
  operation: () => Promise<void>,
) => {
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    const method = url.pathname.split("/").pop() ?? "";
    calls.push(method);
    return new Response(JSON.stringify(handler(method)), {
      headers: { "content-type": "application/json" },
      status: 200,
    });
  }) as typeof fetch;
  try {
    await operation();
  } finally {
    globalThis.fetch = originalFetch;
  }
  return calls;
};

test("community token publishes with wall permission even though VK rejects wall photo uploads", async () => {
  const client = createVkClient({ accessToken: "community", logger });
  let access: VkPublishingAccess | undefined;
  await withFetch(
    (method) => {
      if (method === "account.getAppPermissions") return groupAuthDenial;
      if (method === "groups.getTokenPermissions")
        return {
          response: {
            mask: 12_292,
            permissions: [
              { name: "photos", setting: 4 },
              { name: "wall", setting: 8_192 },
            ],
          },
        };
      return groupAuthDenial;
    },
    async () => {
      access = await client.inspectPublishingAccess("177090031");
    },
  );
  assert.ok(access);
  assert.equal(access.tokenKind, "community");
  assert.deepEqual(access.permissions, ["photos", "wall"]);
  assert.equal(access.canPublish, true);
  assert.equal(access.canAttachPhotos, false);
  assert.equal(access.probe, "ok");
});

test("community token without wall permission is rejected", async () => {
  const client = createVkClient({ accessToken: "community", logger });
  let access: VkPublishingAccess | undefined;
  await withFetch(
    (method) =>
      method === "groups.getTokenPermissions"
        ? {
            response: {
              mask: 4_100,
              permissions: [{ name: "messages", setting: 4_096 }],
            },
          }
        : groupAuthDenial,
    async () => {
      access = await client.inspectPublishingAccess("177090031");
    },
  );
  assert.ok(access);
  assert.equal(access.canPublish, false);
  assert.deepEqual(access.missing, ["wall"]);
});

test("wall post with images publishes text only when the community token cannot upload photos", async () => {
  const client = createVkClient({ accessToken: "community", logger });
  let published:
    | {
        attachedImages: number;
        externalId: string;
        skippedImages: number;
        url: string;
      }
    | undefined;
  const calls = await withFetch(
    (method) => {
      if (method === "photos.getWallUploadServer") return groupAuthDenial;
      if (method === "wall.post") return { response: { post_id: 321 } };
      throw new Error(`unexpected method ${method}`);
    },
    async () => {
      published = await client.publishWallPost({
        groupId: "177090031",
        idempotencyKey: "plan-1",
        images: [
          {
            content: new Uint8Array([1]),
            contentType: "image/png",
            fileName: "a.png",
          },
        ],
        text: "Текст поста",
      });
    },
  );
  assert.ok(published);
  assert.equal(published.externalId, "321");
  assert.equal(published.url, "https://vk.com/wall-177090031_321");
  assert.equal(published.attachedImages, 0);
  assert.equal(published.skippedImages, 1);
  assert.deepEqual(calls, ["photos.getWallUploadServer", "wall.post"]);
});

test("wall post keeps failing on a real token error", async () => {
  const client = createVkClient({ accessToken: "community", logger });
  let caught: unknown;
  await withFetch(
    () => ({
      error: {
        error_code: 5,
        error_msg: "User authorization failed: invalid access_token.",
      },
    }),
    async () => {
      try {
        await client.publishWallPost({
          groupId: "177090031",
          idempotencyKey: "plan-2",
          images: [
            {
              content: new Uint8Array([1]),
              contentType: "image/png",
              fileName: "a.png",
            },
          ],
          text: "Текст поста",
        });
      } catch (error) {
        caught = error;
      }
    },
  );
  assert.ok(caught instanceof VkApiError);
  assert.equal(caught.code, 5);
});
