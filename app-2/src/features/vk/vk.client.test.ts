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

test("separate user token confirms photo-upload access without changing community permissions", async () => {
  const client = createVkClient({
    accessToken: "community",
    photoUploadAccessToken: "user",
    logger,
  });
  let access: VkPublishingAccess | undefined;
  await withFetch(
    (method) => {
      if (method === "account.getAppPermissions") return groupAuthDenial;
      if (method === "groups.getTokenPermissions")
        return {
          response: {
            permissions: [
              { name: "wall", setting: 8_192 },
              { name: "messages", setting: 4_096 },
            ],
          },
        };
      if (method === "photos.getWallUploadServer")
        return { response: { upload_url: "https://upload.vk.test/photo" } };
      throw new Error(`unexpected method ${method}`);
    },
    async () => {
      access = await client.inspectPublishingAccess("177090031");
    },
  );
  assert.ok(access);
  assert.equal(access.tokenKind, "community");
  assert.deepEqual(access.permissions, ["wall", "messages"]);
  assert.equal(access.canPublish, true);
  assert.equal(access.canAttachPhotos, true);
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

test("community-only token does not silently publish an image post without its photo", async () => {
  const client = createVkClient({ accessToken: "community", logger });
  let caught: unknown;
  const calls = await withFetch(
    (method) => {
      if (method === "photos.getWallUploadServer") return groupAuthDenial;
      throw new Error(`unexpected method ${method}`);
    },
    async () => {
      try {
        await client.publishWallPost({
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
      } catch (error) {
        caught = error;
      }
    },
  );
  assert.ok(caught instanceof VkApiError);
  assert.equal(caught.code, 27);
  assert.match(caught.message, /requires a user access token/u);
  assert.deepEqual(calls, ["photos.getWallUploadServer"]);
});

test("photo preflight uses the separate token and requires an upload URL", async () => {
  const originalFetch = globalThis.fetch;
  const tokens: Array<string | null> = [];
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    tokens.push(url.searchParams.get("access_token"));
    return new Response(JSON.stringify({ response: { upload_url: "" } }), {
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
  try {
    const client = createVkClient({
      accessToken: "community-token",
      photoUploadAccessToken: "photo-token",
      logger,
    });
    await assert.rejects(
      client.verifyWallPhotoUpload("177090031"),
      /URL is missing/u,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.deepEqual(tokens, ["photo-token"]);
});

test("user token uploads photos while community token publishes the wall post", async () => {
  const originalFetch = globalThis.fetch;
  const apiCalls: Array<{ method: string; token: string | null }> = [];
  let published:
    | {
        attachedImages: number;
        externalId: string;
        url: string;
      }
    | undefined;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    if (url.hostname === "upload.vk.test")
      return new Response(
        JSON.stringify({ server: 1, photo: "uploaded-photo", hash: "hash" }),
        { headers: { "content-type": "application/json" } },
      );
    const method = url.pathname.split("/").pop() ?? "";
    apiCalls.push({ method, token: url.searchParams.get("access_token") });
    const response =
      method === "photos.getWallUploadServer"
        ? { response: { upload_url: "https://upload.vk.test/photo" } }
        : method === "photos.saveWallPhoto"
          ? { response: [{ owner_id: -177090031, id: 456, access_key: "key" }] }
          : method === "wall.post"
            ? { response: { post_id: 321 } }
            : { error: { error_code: 1, error_msg: "unexpected method" } };
    return new Response(JSON.stringify(response), {
      headers: { "content-type": "application/json" },
      status: 200,
    });
  }) as typeof fetch;
  try {
    const client = createVkClient({
      accessToken: "community-token",
      photoUploadAccessToken: "user-token",
      logger,
    });
    published = await client.publishWallPost({
      groupId: "177090031",
      idempotencyKey: "plan-with-image",
      images: [
        {
          content: new Uint8Array([1]),
          contentType: "image/png",
          fileName: "a.png",
        },
      ],
      text: "Текст поста",
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.ok(published);
  assert.equal(published.externalId, "321");
  assert.equal(published.url, "https://vk.com/wall-177090031_321");
  assert.equal(published.attachedImages, 1);
  assert.deepEqual(apiCalls, [
    { method: "photos.getWallUploadServer", token: "user-token" },
    { method: "photos.saveWallPhoto", token: "user-token" },
    { method: "wall.post", token: "community-token" },
  ]);
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
