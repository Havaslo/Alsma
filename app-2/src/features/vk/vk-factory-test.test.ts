import express from "express";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { once } from "node:events";
import test from "node:test";

import type { Database } from "../../lib/database/database.js";
import type { ManagedStorage } from "../../lib/storage/managed-storage.js";
import { createVkFactoryTestRouter } from "./vk-factory-test.js";

const postId = "11111111-1111-4111-8111-111111111111";
const imageId = "22222222-2222-4222-8222-222222222222";
const uploadUrl =
  "https://pu.vk.ru/c123/ss456/upload.php?act=do_add&gid=138003065&hash=test&rhash=test";

test("admin prepares one isolated test, publishes its image once, and cannot redirect the target", async () => {
  const oldToken = process.env.VK_BLACK_TURTLE_TEST_TOKEN;
  process.env.VK_BLACK_TURTLE_TEST_TOKEN = "synthetic-token";
  const originalFetch = globalThis.fetch;
  let postRequests = 0;
  let adminPermission = true;
  const db = {
    client: {
      adminSession: {
        findFirst: async ({ where }: { where: { tokenHash: string } }) =>
          where.tokenHash ===
          createHash("sha256").update("admin-token").digest("hex")
            ? {
                user: {
                  id: "admin",
                  displayName: "Admin",
                  email: "a@example.com",
                  permissionOverrides: {},
                  role: {
                    name: "admin",
                    permissions: adminPermission ? ["site.manage"] : [],
                  },
                },
              }
            : null,
      },
      contentPlanPost: {
        findUnique: async () => ({
          channel: "vk",
          status: "needs_review",
          generatedCopy: "Тест фабрики",
          imageIds: [imageId],
        }),
      },
      contentFactoryMedia: {
        findUnique: async () => ({
          objectId: "object",
          sizeBytes: 3,
          contentType: "image/jpeg",
        }),
      },
    },
  } as unknown as Database;
  const storage = {
    getDownload: async () => ({
      downloadUrl: "https://storage.example/image",
      sizeBytes: 3,
    }),
  } as unknown as ManagedStorage;
  globalThis.fetch = (async (input, init) => {
    const url = String(input);
    if (url === "https://storage.example/image")
      return new Response(new Uint8Array([1, 2, 3]));
    if (url === uploadUrl) {
      assert.equal(init?.redirect, "error");
      assert.equal(((init?.body as FormData).get("photo") as File).size, 3);
      return Response.json({ server: 1, photo: "data", hash: "hash" });
    }
    if (url === "https://api.vk.com/method/wall.post") {
      postRequests++;
      const params = init?.body as URLSearchParams;
      assert.equal(params.get("owner_id"), "-138003065");
      assert.equal(params.get("message"), "Тест фабрики");
      assert.equal(params.get("attachments"), "photo123_456_key");
      assert.equal(params.get("access_token"), "synthetic-token");
      return Response.json({ response: { post_id: 987 } });
    }
    throw new Error("unexpected external request");
  }) as typeof fetch;
  const app = express();
  app.use(express.json());
  app.use(createVkFactoryTestRouter(db, storage));
  app.use(
    (
      err: { statusCode?: number },
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      res.status(err.statusCode ?? 401).json({ error: "unauthorized" });
    },
  );
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("no test server");
  const request = async (path: string, body: unknown, authorized = false) =>
    originalFetch(`http://127.0.0.1:${address.port}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authorized ? { Authorization: "Bearer admin-token" } : {}),
      },
      body: JSON.stringify(body),
    });
  try {
    assert.notEqual((await request("/prepare", { postId })).status, 201);
    adminPermission = false;
    assert.notEqual((await request("/prepare", { postId }, true)).status, 201);
    adminPermission = true;
    const prepared = await request("/prepare", { postId }, true);
    assert.equal(prepared.status, 201);
    const { code } = (await prepared.json()) as { code: string };
    assert.match(code, /^[a-f0-9]{64}$/);
    assert.equal(
      (
        await request("/upload", {
          code,
          uploadUrl: uploadUrl.replace("138003065", "1"),
        })
      ).status,
      400,
    );
    assert.equal((await request("/upload", { code, uploadUrl })).status, 200);
    assert.equal(
      (
        await request("/publish", {
          code,
          userId: 123,
          photo: { ownerId: 999, id: 456, accessKey: "key" },
        })
      ).status,
      400,
    );
    const result = await request("/publish", {
      code,
      userId: 123,
      photo: { ownerId: 123, id: 456, accessKey: "key" },
    });
    assert.equal(result.status, 200);
    assert.deepEqual(await result.json(), { postId: 987 });
    assert.equal(
      (
        await request("/publish", {
          code,
          userId: 123,
          photo: { ownerId: 123, id: 456, accessKey: "key" },
        })
      ).status,
      400,
    );
    assert.equal(postRequests, 1);
  } finally {
    server.close();
    globalThis.fetch = originalFetch;
    if (oldToken === undefined) delete process.env.VK_BLACK_TURTLE_TEST_TOKEN;
    else process.env.VK_BLACK_TURTLE_TEST_TOKEN = oldToken;
  }
});
