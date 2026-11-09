import assert from "node:assert/strict";
import test from "node:test";
import type { Logger } from "pino";

import {
  VkApiError,
  VkPhotoUploadEmptyError,
  VkPostVerificationError,
  VkPublicationUnknownError,
  createVkClient,
} from "./vk.client.js";
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
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
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
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    tokens.push((init?.body as URLSearchParams).get("access_token"));
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
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    if (url.hostname === "upload.vk.test")
      return new Response(
        JSON.stringify({ server: 1, photo: "uploaded-photo", hash: "hash" }),
        { headers: { "content-type": "application/json" } },
      );
    const method = url.pathname.split("/").pop() ?? "";
    assert.equal(url.searchParams.has("access_token"), false);
    assert.equal(init?.method, "POST");
    apiCalls.push({
      method,
      token: (init?.body as URLSearchParams).get("access_token"),
    });
    if (method === "wall.getById")
      return Response.json({
        response: [
          {
            id: 321,
            owner_id: -177090031,
            attachments: [
              { type: "photo", photo: { id: 456, owner_id: -177090031 } },
            ],
          },
        ],
      });
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
    { method: "wall.getById", token: "user-token" },
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

test("retries a rejected com upload on exact ru host before saving and posts only once", async () => {
  const original = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = (async (input, init) => {
    const url = new URL(String(input));
    calls.push(
      url.hostname === "api.vk.ru"
        ? url.pathname.split("/").pop()!
        : url.hostname,
    );
    if (url.hostname === "pu.vk.com") return new Response("", { status: 405 });
    if (url.hostname === "pu.vk.ru") {
      assert.equal(init?.method, "POST");
      assert.equal(init?.redirect, "error");
      assert.equal(url.searchParams.get("hash"), "capability");
      return new Response(
        JSON.stringify({ server: 1, photo: "photo", hash: "hash" }),
      );
    }
    const method = url.pathname.split("/").pop();
    if (method === "wall.getById")
      return Response.json({
        response: [
          {
            id: 99,
            owner_id: -138003065,
            attachments: [
              { type: "photo", photo: { id: 42, owner_id: -138003065 } },
            ],
          },
        ],
      });
    return new Response(
      JSON.stringify({
        response:
          method === "photos.getWallUploadServer"
            ? {
                upload_url:
                  "https://pu.vk.com/c1/ss2/upload.php?hash=capability",
              }
            : method === "photos.saveWallPhoto"
              ? [{ owner_id: -138003065, id: 42 }]
              : { post_id: 99 },
      }),
    );
  }) as typeof fetch;
  try {
    const result = await createVkClient({
      accessToken: "group",
      photoUploadAccessToken: "user",
      logger,
    }).publishWallPost({
      groupId: "138003065",
      idempotencyKey: "retry-upload",
      text: "test",
      images: [
        {
          content: new Uint8Array([1]),
          contentType: "image/jpeg",
          fileName: "test.jpg",
        },
      ],
    });
    assert.equal(result.attachedImages, 1);
  } finally {
    globalThis.fetch = original;
  }
  assert.deepEqual(calls, [
    "photos.getWallUploadServer",
    "pu.vk.com",
    "pu.vk.ru",
    "photos.saveWallPhoto",
    "wall.post",
    "wall.getById",
  ]);
});

test("photo preparation never publishes and only returns safe saved-photo metadata", async () => {
  const original = globalThis.fetch;
  const methods: string[] = [];
  globalThis.fetch = (async (input, init) => {
    const url = new URL(String(input));
    if (url.hostname === "upload.vk.test") {
      assert.ok(init?.body instanceof Uint8Array);
      const wire = Buffer.from(init.body);
      assert.equal(wire.subarray(-4).toString(), "--\r\n");
      assert.equal(
        new Headers(init.headers).get("content-length"),
        String(wire.length),
      );
      const parsed = await new Response(wire, {
        headers: init.headers,
      }).formData();
      const file = parsed.get("photo") as File;
      assert.equal(file.name, "test.jpg");
      assert.deepEqual(
        new Uint8Array(await file.arrayBuffer()),
        new Uint8Array([1]),
      );
      return Response.json({ server: 1, photo: "photo", hash: "hash" });
    }
    const method = url.pathname.split("/").pop()!;
    methods.push(method);
    if (method === "photos.getWallUploadServer")
      return Response.json({
        response: { upload_url: "https://upload.vk.test/photo" },
      });
    if (method === "photos.saveWallPhoto")
      return Response.json({
        response: [
          {
            owner_id: 123,
            id: 456,
            access_key: "private-key",
            album_id: -7,
            sizes: [{ url: "private-url" }],
          },
        ],
      });
    throw new Error("Must not publish");
  }) as typeof fetch;
  try {
    const result = await createVkClient({
      accessToken: "group",
      photoUploadAccessToken: "user",
      logger,
    }).publishWallPost({
      groupId: "138003065",
      idempotencyKey: "prepare",
      prepareOnly: true,
      text: "test",
      images: [
        {
          content: new Uint8Array([1]),
          contentType: "image/jpeg",
          fileName: "test.jpg",
        },
      ],
    });
    assert.equal(result.url, "");
    assert.deepEqual(result.preparedPhotos, [
      { ownerId: "123", id: "456", hasAccessKey: true, sizes: 1, albumId: -7 },
    ]);
    assert.ok(!JSON.stringify(result).includes("private-"));
  } finally {
    globalThis.fetch = original;
  }
  assert.deepEqual(methods, [
    "photos.getWallUploadServer",
    "photos.saveWallPhoto",
  ]);
});

test("empty upload photo cannot reach save or wall.post", async () => {
  const original = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = (async (input) => {
    const url = new URL(String(input));
    calls.push(url.hostname);
    if (url.hostname === "upload.vk.test")
      return Response.json({ server: 1, photo: "[]", hash: "hash" });
    return Response.json({
      response: { upload_url: "https://upload.vk.test/photo" },
    });
  }) as typeof fetch;
  try {
    await assert.rejects(
      createVkClient({
        accessToken: "group",
        photoUploadAccessToken: "user",
        logger,
      }).publishWallPost({
        groupId: "138003065",
        idempotencyKey: "empty",
        text: "test",
        images: [
          {
            content: new Uint8Array([1]),
            contentType: "image/jpeg",
            fileName: "test.jpg",
          },
        ],
      }),
      (error) =>
        error instanceof VkPhotoUploadEmptyError &&
        error.method === "photos.upload",
    );
  } finally {
    globalThis.fetch = original;
  }
  assert.deepEqual(
    calls,
    Array(3).fill(["api.vk.ru", "upload.vk.test"]).flat(),
  );
});

test("wall.post success without a returned photo is not reported as success", async () => {
  const original = globalThis.fetch;
  let posts = 0;
  globalThis.fetch = (async (input) => {
    const url = new URL(String(input));
    if (url.hostname === "upload.vk.test")
      return Response.json({ server: 1, photo: "photo", hash: "hash" });
    const method = url.pathname.split("/").pop();
    if (method === "photos.getWallUploadServer")
      return Response.json({
        response: { upload_url: "https://upload.vk.test/photo" },
      });
    if (method === "photos.saveWallPhoto")
      return Response.json({ response: [{ owner_id: 123, id: 456 }] });
    if (method === "wall.post") {
      posts++;
      return Response.json({ response: { post_id: 77 } });
    }
    if (method === "wall.getById")
      return Response.json({
        response: {
          items: [{ id: 77, owner_id: -138003065, attachments: [] }],
        },
      });
    throw new Error("Unexpected method");
  }) as typeof fetch;
  try {
    await assert.rejects(
      createVkClient({
        accessToken: "group",
        photoUploadAccessToken: "user",
        logger,
      }).publishWallPost({
        groupId: "138003065",
        idempotencyKey: "missing",
        text: "test",
        images: [
          {
            content: new Uint8Array([1]),
            contentType: "image/jpeg",
            fileName: "test.jpg",
          },
        ],
      }),
      (error) =>
        error instanceof VkPostVerificationError &&
        error.url === "https://vk.com/wall-138003065_77",
    );
  } finally {
    globalThis.fetch = original;
  }
  assert.equal(posts, 1);
});

test("missing group role flags remain unknown rather than false", async () => {
  await withFetch(
    (method) =>
      method === "users.get"
        ? { response: [{ id: 120486641 }] }
        : { response: { groups: [{ id: 138003065 }] } },
    async () => {
      const result = await createVkClient({
        accessToken: "group",
        photoUploadAccessToken: "user",
        logger,
      }).inspectPhotoGroupRole("138003065");
      assert.deepEqual(result, {
        userId: 120486641,
        groupFound: true,
        isAdmin: null,
        adminLevel: null,
        isMember: null,
      });
    },
  );
});

test("message-photo diagnostic uses only community auth and never publishes", async () => {
  const calls = await withFetch(
    (method) => {
      if (method === "photos.getMessagesUploadServer")
        return { response: { upload_url: "https://upload.vk.test/photo" } };
      if (method === "photo")
        return { server: 1, photo: "encoded", hash: "hash" };
      if (method === "photos.saveMessagesPhoto")
        return { response: [{ owner_id: -138003065, id: 1 }] };
      throw new Error("Unexpected method");
    },
    async () => {
      const result = await createVkClient({
        accessToken: "group",
        getPhotoUploadAccessToken: async () => {
          throw new Error("User token must not be used");
        },
        logger,
      }).publishWallPost({
        groupId: "138003065",
        idempotencyKey: "probe",
        text: "test",
        images: [
          {
            content: new Uint8Array([1]),
            contentType: "image/jpeg",
            fileName: "test.jpg",
          },
        ],
        prepareOnly: true,
        diagnosticMessages: true,
      });
      assert.equal(result.preparedPhotos?.[0]?.ownerId, "-138003065");
    },
  );
  assert.deepEqual(calls, [
    "photos.getMessagesUploadServer",
    "photo",
    "photos.saveMessagesPhoto",
  ]);
});

test("an unrelated existing photo does not confirm the requested attachment", async () => {
  await withFetch(
    (method) => {
      if (method === "photos.getWallUploadServer")
        return { response: { upload_url: "https://upload.vk.test/photo" } };
      if (method === "photo") return { server: 1, photo: "data", hash: "h" };
      if (method === "photos.saveWallPhoto")
        return { response: [{ owner_id: 123, id: 456 }] };
      if (method === "wall.post") return { response: { post_id: 99 } };
      if (method === "wall.getById")
        return {
          response: {
            items: [
              {
                id: 99,
                owner_id: -138003065,
                attachments: [
                  { type: "photo", photo: { owner_id: 999, id: 456 } },
                ],
              },
            ],
          },
        };
      throw Error("Unexpected method");
    },
    async () => {
      await assert.rejects(
        createVkClient({
          accessToken: "group",
          photoUploadAccessToken: "user",
          logger,
        }).publishWallPost({
          groupId: "138003065",
          idempotencyKey: "unique",
          text: "test",
          images: [
            {
              content: new Uint8Array([1]),
              contentType: "image/jpeg",
              fileName: "a.jpg",
            },
          ],
        }),
        VkPostVerificationError,
      );
    },
  );
});

test("wall.post is attempted once even on a retryable API error", async () => {
  const calls = await withFetch(
    () => ({ error: { error_code: 10, error_msg: "internal" } }),
    async () => {
      await assert.rejects(
        createVkClient({ accessToken: "group", logger }).publishWallPost({
          groupId: "138003065",
          idempotencyKey: "unique",
          text: "test",
          images: [],
        }),
        VkApiError,
      );
    },
  );
  assert.deepEqual(calls, ["wall.post"]);
});

test("wall.post transport failures and incomplete responses stay uncertain and are never retried", async () => {
  const original = globalThis.fetch;
  try {
    for (const response of [
      () => new Response("gateway", { status: 502 }),
      () => new Response("invalid json", { status: 200 }),
      () => Response.json({}),
      () => Response.json({ response: { post_id: "" } }),
      () => Response.json({ response: { post_id: 0 } }),
      () =>
        Response.json(
          { error: { error_code: 500, error_msg: "gateway" } },
          { status: 500 },
        ),
    ]) {
      let calls = 0;
      globalThis.fetch = async () => {
        calls++;
        return response();
      };
      await assert.rejects(
        createVkClient({ accessToken: "group", logger }).publishWallPost({
          groupId: "138003065",
          idempotencyKey: "unknown-response",
          text: "test",
          images: [],
        }),
        VkPublicationUnknownError,
      );
      assert.equal(calls, 1);
    }
  } finally {
    globalThis.fetch = original;
  }
});

test("wall.post without a post ID has an uncertain result and is not retried", async () => {
  const calls = await withFetch(
    () => ({ response: {} }),
    async () => {
      await assert.rejects(
        createVkClient({ accessToken: "group", logger }).publishWallPost({
          groupId: "138003065",
          idempotencyKey: "missing-id",
          text: "test",
          images: [],
        }),
        VkPublicationUnknownError,
      );
    },
  );
  assert.deepEqual(calls, ["wall.post"]);
});

test("empty upload retries fresh server only and publishes once after success", async () => {
  const original = globalThis.fetch;
  let uploads = 0;
  let servers = 0;
  let posts = 0;
  globalThis.fetch = (async (input) => {
    const url = new URL(String(input));
    if (url.hostname === "upload.vk.test")
      return Response.json({
        server: 1,
        hash: "hash",
        photo: ++uploads === 1 ? "" : "[photo]",
      });
    const method = url.pathname.split("/").pop();
    if (method === "photos.getWallUploadServer") {
      servers++;
      return Response.json({
        response: { upload_url: "https://upload.vk.test/photo" },
      });
    }
    if (method === "photos.saveWallPhoto")
      return Response.json({ response: [{ owner_id: 123, id: 456 }] });
    if (method === "wall.post") {
      posts++;
      return Response.json({ response: { post_id: 99 } });
    }
    if (method === "wall.getById")
      return Response.json({
        response: [
          {
            id: 99,
            owner_id: -138003065,
            attachments: [{ type: "photo", photo: { owner_id: 123, id: 456 } }],
          },
        ],
      });
    throw Error("Unexpected request");
  }) as typeof fetch;
  try {
    const result = await createVkClient({
      accessToken: "group",
      photoUploadAccessToken: "user",
      logger,
    }).publishWallPost({
      groupId: "138003065",
      idempotencyKey: "retry-empty",
      text: "test",
      images: [
        {
          content: new Uint8Array([1]),
          contentType: "image/jpeg",
          fileName: "a.jpg",
        },
      ],
    });
    assert.equal(result.externalId, "99");
    assert.equal(uploads, 2);
    assert.equal(servers, 2);
    assert.equal(posts, 1);
  } finally {
    globalThis.fetch = original;
  }
});

test("wall inspection uses user photo access because group auth cannot read wall.getById", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async (_input, init) => {
    const body = new URLSearchParams(String(init?.body));
    assert.equal(body.get("access_token"), "user");
    return Response.json({
      response: [
        {
          id: 15,
          owner_id: -138003065,
          attachments: [
            { type: "photo", photo: { id: 456, owner_id: 123, sizes: [{}] } },
          ],
        },
      ],
    });
  }) as typeof fetch;
  try {
    assert.deepEqual(
      await createVkClient({
        accessToken: "group",
        photoUploadAccessToken: "user",
        logger,
      }).readWallPost("138003065", "15"),
      { found: true, photos: [{ id: "456", ownerId: "123", sizes: 1 }] },
    );
  } finally {
    globalThis.fetch = original;
  }
});

test("community copies are confirmed by image bytes, unrelated photos are rejected", async () => {
  const original = globalThis.fetch;
  try {
    for (const same of [true, false]) {
      globalThis.fetch = (async (input) => {
        const url = new URL(String(input));
        if (url.hostname === "photo.userapi.com")
          return new Response(
            url.pathname === "/saved" || same
              ? "same image"
              : "different image",
          );
        if (url.hostname === "upload.vk.test")
          return Response.json({ server: 1, hash: "hash", photo: "[photo]" });
        const method = url.pathname.split("/").pop();
        if (method === "photos.getWallUploadServer")
          return Response.json({
            response: { upload_url: "https://upload.vk.test/photo" },
          });
        if (method === "photos.saveWallPhoto")
          return Response.json({
            response: [
              {
                owner_id: 123,
                id: 456,
                sizes: [
                  {
                    width: 1280,
                    height: 720,
                    url: "https://photo.userapi.com/saved",
                  },
                ],
              },
            ],
          });
        if (method === "wall.post")
          return Response.json({ response: { post_id: 99 } });
        if (method === "wall.getById")
          return Response.json({
            response: [
              {
                id: 99,
                owner_id: -138003065,
                attachments: [
                  {
                    type: "photo",
                    photo: {
                      owner_id: -138003065,
                      id: 987,
                      sizes: [
                        {
                          width: 1280,
                          height: 720,
                          url: "https://photo.userapi.com/copied",
                        },
                      ],
                    },
                  },
                ],
              },
            ],
          });
        throw Error("Unexpected request");
      }) as typeof fetch;
      const operation = createVkClient({
        accessToken: "group",
        photoUploadAccessToken: "user",
        logger,
      }).publishWallPost({
        groupId: "138003065",
        idempotencyKey: "copy-test",
        text: "test",
        images: [
          {
            content: new Uint8Array([1]),
            contentType: "image/jpeg",
            fileName: "a.jpg",
          },
        ],
      });
      if (same) assert.equal((await operation).externalId, "99");
      else await assert.rejects(operation, VkPostVerificationError);
    }
  } finally {
    globalThis.fetch = original;
  }
});

test("photo auth rejection refreshes once; permission errors and second rejection do not loop", async () => {
  const original = globalThis.fetch;
  try {
    for (const code of [5, 15, 27]) {
      for (const secondFailure of [false, true]) {
        let refreshes = 0;
        const tokens: string[] = [];
        globalThis.fetch = (async (_input, init) => {
          tokens.push((init!.body as URLSearchParams).get("access_token")!);
          return Response.json(
            tokens.length === 1 || secondFailure
              ? { error: { error_code: code, error_msg: "denied" } }
              : { response: { upload_url: "https://pu.vk.ru/upload" } },
          );
        }) as typeof fetch;
        const client = createVkClient({
          accessToken: "community",
          getPhotoUploadAccessToken: async () => "old-user",
          refreshPhotoUploadAccessToken: async (rejected) => {
            assert.equal(rejected, "old-user");
            refreshes++;
            return "new-user";
          },
          logger,
        });
        if (code === 5 && !secondFailure)
          await client.verifyWallPhotoUpload("456");
        else await assert.rejects(client.verifyWallPhotoUpload("456"));
        assert.equal(refreshes, code === 5 ? 1 : 0);
        assert.deepEqual(
          tokens,
          code === 5 ? ["old-user", "new-user"] : ["old-user"],
        );
      }
    }
  } finally {
    globalThis.fetch = original;
  }
});

test("prepared attachments publish with community auth without accessing expired photo token", async () => {
  const originalFetch = globalThis.fetch;
  let posts = 0;
  globalThis.fetch = (async (input, init) => {
    assert.ok(String(input).includes("wall.post"));
    const parameters = new URLSearchParams(String(init?.body));
    assert.equal(parameters.get("access_token"), "community");
    assert.equal(parameters.get("attachments"), "photo-123_11,photo-123_12");
    assert.equal(parameters.get("guid"), "post-stable-id");
    posts++;
    return new Response(JSON.stringify({ response: { post_id: 99 } }));
  }) as typeof fetch;
  try {
    const client = createVkClient({
      accessToken: "community",
      logger,
      getPhotoUploadAccessToken: async () => {
        throw new Error("expired");
      },
    });
    const result = await client.publishPreparedWallPost({
      groupId: "123",
      idempotencyKey: "post-stable-id",
      attachments: ["photo-123_11", "photo-123_12"],
      text: "Scheduled post",
    });
    assert.equal(result.externalId, "99");
    assert.equal(posts, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
