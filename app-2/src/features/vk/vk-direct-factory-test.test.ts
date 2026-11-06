import express from "express";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { once } from "node:events";
import test from "node:test";
import type { Logger } from "pino";

import type { Database } from "../../lib/database/database.js";
import type { ManagedStorage } from "../../lib/storage/managed-storage.js";
import { createVkDirectFactoryTestRouter } from "./vk-direct-factory-test.js";

const postId = "11111111-1111-4111-8111-111111111111";
const photoId = "22222222-2222-4222-8222-222222222222";
const uploadUrl =
  "https://pu.vk.ru/c123/ss456/upload.php?act=do_add&gid=138003065&hash=test&rhash=test";
const logger = { warn: () => undefined } as unknown as Logger;
test("test publishing is authenticated, uses separate tokens, and never targets production", async () => {
  const priorGroup = process.env.VK_BLACK_TURTLE_TEST_TOKEN,
    priorPhoto = process.env.VK_BLACK_TURTLE_TEST_PHOTO_TOKEN;
  process.env.VK_BLACK_TURTLE_TEST_TOKEN = "group-secret";
  delete process.env.VK_BLACK_TURTLE_TEST_PHOTO_TOKEN;
  const realFetch = globalThis.fetch;
  const calls: string[] = [];
  let failPost = false;
  let denyPhoto = false;
  const db = {
    client: {
      adminSession: {
        findFirst: async ({ where }: { where: { tokenHash: string } }) =>
          where.tokenHash === createHash("sha256").update("admin").digest("hex")
            ? {
                user: {
                  id: "admin",
                  displayName: "Admin",
                  email: "admin@example.com",
                  permissionOverrides: {},
                  role: { name: "admin", permissions: ["site.manage"] },
                },
              }
            : null,
      },
      contentPlanPost: {
        findUnique: async () => ({
          channel: "vk",
          status: "needs_review",
          generatedCopy: "Тест фабрики",
          imageIds: [photoId],
        }),
      },
      contentFactoryMedia: {
        findUnique: async () => ({
          objectId: "img",
          fileName: "img.jpg",
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
    const url = new URL(String(input));
    if (url.hostname === "storage.example")
      return new Response(new Uint8Array([1, 2, 3]));
    if (url.hostname === "pu.vk.ru") {
      assert.equal(init?.redirect, "error");
      return Response.json({ server: 1, photo: "data", hash: "hash" });
    }
    const method = url.pathname.split("/").pop()!;
    const params =
      init?.body instanceof URLSearchParams ? init.body : url.searchParams;
    assert.equal(url.searchParams.has("access_token"), false);
    calls.push(method);
    if (method === "users.get") {
      assert.equal(params.get("access_token"), "photo-secret-xxxxxxxxxxxxxxxx");
      return Response.json({ response: [{ id: 120486641 }] });
    }
    if (method === "groups.getById") {
      assert.ok(
        ["group-secret", "photo-secret-xxxxxxxxxxxxxxxx"].includes(
          params.get("access_token")!,
        ),
      );
      assert.equal(
        params.get("group_ids") ?? params.get("group_id"),
        "138003065",
      );
      return Response.json({
        response: [
          { id: 138003065, is_admin: 1, admin_level: 3, is_member: 1 },
        ],
      });
    }
    if (method === "photos.getWallUploadServer") {
      assert.equal(params.get("access_token"), "photo-secret-xxxxxxxxxxxxxxxx");
      assert.equal(params.get("group_id"), "138003065");
      if (denyPhoto)
        return Response.json({
          error: {
            error_code: 5,
            error_msg:
              "access_token was given to another ip address. secret-value",
          },
        });
      return Response.json({ response: { upload_url: uploadUrl } });
    }
    if (method === "photos.saveWallPhoto") {
      assert.equal(params.get("access_token"), "photo-secret-xxxxxxxxxxxxxxxx");
      return Response.json({
        response: [{ owner_id: 123, id: 456, access_key: "key" }],
      });
    }
    if (method === "wall.getById")
      return Response.json({
        response: [
          {
            id: 99,
            owner_id: -138003065,
            attachments: [{ type: "photo", photo: { id: 456 } }],
          },
        ],
      });
    if (method === "wall.post") {
      assert.equal(params.get("access_token"), "group-secret");
      assert.equal(params.get("owner_id"), "-138003065");
      assert.equal(params.get("attachments"), "photo123_456_key");
      if (failPost) throw new TypeError("network lost");
      return Response.json({ response: { post_id: 99 } });
    }
    throw Error("unexpected method");
  }) as typeof fetch;
  const app = express();
  app.use(express.json());
  app.use(createVkDirectFactoryTestRouter(db, storage, logger));
  app.use(
    "/probe",
    createVkDirectFactoryTestRouter(
      db,
      storage,
      logger,
      async () => "photo-secret-xxxxxxxxxxxxxxxx",
      false,
    ),
  );
  app.use(
    (
      error: { statusCode?: number },
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => res.status(error.statusCode ?? 401).json({ error: "unauthorized" }),
  );
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const a = server.address();
  if (!a || typeof a === "string") throw Error("no server");
  const request = (path: string, auth = true, body: unknown = { postId }) =>
    realFetch(`http://127.0.0.1:${a.port}${path}`, {
      method: path === "/status" ? "GET" : "POST",
      headers: {
        "Content-Type": "application/json",
        ...(auth ? { Authorization: "Bearer admin" } : {}),
      },
      ...(path === "/status" ? {} : { body: JSON.stringify(body) }),
    });
  try {
    assert.notEqual((await request("/publish", false)).status, 200);
    const forbidden = await request("/probe/publish");
    assert.equal(forbidden.status, 403);
    assert.deepEqual(await forbidden.json(), { error: "PREPARATION_ONLY" });
    assert.equal(calls.length, 0);
    let status = await request("/status");
    assert.deepEqual(await status.json(), {
      ready: false,
      reason: "PHOTO_TOKEN_MISSING",
    });
    assert.equal((await request("/publish")).status, 409);
    assert.equal(calls.length, 0);
    const token = "photo-secret-xxxxxxxxxxxxxxxx";
    const access = (value: string) => ({
      url: `https://oauth.vk.com/blank.html#access_token=${value}&expires_in=86400&user_id=1`,
    });
    const bad = await request("/token", true, access("short"));
    assert.equal(bad.status, 400);
    denyPhoto = true;
    const rejected = await request("/token", true, access(token));
    assert.equal(rejected.status, 400);
    assert.deepEqual(await rejected.json(), {
      error: "VK_ACCESS_DENIED",
      code: 5,
      reason: "IP_MISMATCH",
    });
    assert.deepEqual(await (await request("/status")).json(), {
      ready: false,
      reason: "PHOTO_TOKEN_MISSING",
    });
    denyPhoto = false;
    const saved = await request("/token", true, access(token));
    assert.equal(saved.status, 200);
    status = await request("/status");
    const connectedStatus = (await status.json()) as {
      ready: boolean;
      photoGroupRole: unknown;
      network: unknown;
    };
    assert.ok(connectedStatus.network);
    assert.deepEqual(
      {
        ready: connectedStatus.ready,
        photoGroupRole: connectedStatus.photoGroupRole,
      },
      {
        ready: true,
        photoGroupRole: {
          userId: 120486641,
          groupFound: true,
          isAdmin: true,
          adminLevel: 3,
          isMember: true,
        },
      },
    );
    assert.ok(!calls.includes("wall.post"));
    let r = await request("/publish");
    assert.equal(r.status, 200);
    assert.equal(((await r.json()) as { postId: string }).postId, "99");
    assert.equal(calls.filter((c) => c === "wall.post").length, 1);
    failPost = true;
    r = await request("/publish");
    assert.equal(
      ((await r.json()) as { error: string }).error,
      "PUBLICATION_UNKNOWN",
    );
    const count = calls.length;
    assert.equal((await request("/publish")).status, 409);
    assert.equal(calls.length, count);
  } finally {
    server.close();
    globalThis.fetch = realFetch;
    if (priorGroup === undefined) delete process.env.VK_BLACK_TURTLE_TEST_TOKEN;
    else process.env.VK_BLACK_TURTLE_TEST_TOKEN = priorGroup;
    if (priorPhoto === undefined)
      delete process.env.VK_BLACK_TURTLE_TEST_PHOTO_TOKEN;
    else process.env.VK_BLACK_TURTLE_TEST_PHOTO_TOKEN = priorPhoto;
  }
});

test("a VK rejection of wall.post is final and allows a retry", async () => {
  const priorGroup = process.env.VK_BLACK_TURTLE_TEST_TOKEN;
  process.env.VK_BLACK_TURTLE_TEST_TOKEN = "group-secret";
  const realFetch = globalThis.fetch;
  let denyPost = true;
  const db = {
    client: {
      adminSession: {
        findFirst: async ({ where }: { where: { tokenHash: string } }) =>
          where.tokenHash === createHash("sha256").update("admin").digest("hex")
            ? {
                user: {
                  id: "admin",
                  displayName: "Admin",
                  email: "admin@example.com",
                  permissionOverrides: {},
                  role: { name: "admin", permissions: ["site.manage"] },
                },
              }
            : null,
      },
      contentPlanPost: {
        findUnique: async () => ({
          channel: "vk",
          status: "approved",
          generatedCopy: "Тест фабрики",
          imageIds: [photoId],
        }),
      },
      contentFactoryMedia: {
        findUnique: async () => ({
          objectId: "img",
          fileName: "img.jpg",
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
    const url = new URL(String(input));
    if (url.hostname === "storage.example")
      return new Response(new Uint8Array([1, 2, 3]));
    if (url.hostname === "pu.vk.ru")
      return Response.json({ server: 1, photo: "data", hash: "hash" });
    const method = url.pathname.split("/").pop()!;
    if (method === "groups.getById") return Response.json({ response: [] });
    if (method === "photos.getWallUploadServer")
      return Response.json({ response: { upload_url: uploadUrl } });
    if (method === "photos.saveWallPhoto")
      return Response.json({
        response: [{ owner_id: 123, id: 456, access_key: "key" }],
      });
    if (method === "wall.getById")
      return Response.json({
        response: {
          items: [
            {
              id: 77,
              owner_id: -138003065,
              attachments: [{ type: "photo", photo: { id: 456 } }],
            },
          ],
        },
      });
    if (method === "wall.post")
      return denyPost
        ? Response.json({
            error: { error_code: 100, error_msg: "invalid photo" },
          })
        : Response.json({ response: { post_id: 77 } });
    throw Error("unexpected method");
  }) as typeof fetch;
  const app = express();
  app.use(express.json());
  app.use(createVkDirectFactoryTestRouter(db, storage, logger));
  app.use(
    (
      error: { statusCode?: number },
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => res.status(error.statusCode ?? 401).json({ error: "unauthorized" }),
  );
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const a = server.address();
  if (!a || typeof a === "string") throw Error("no server");
  const request = (path: string, auth = true, body: unknown = { postId }) =>
    realFetch(`http://127.0.0.1:${a.port}${path}`, {
      method: path === "/status" ? "GET" : "POST",
      headers: {
        "Content-Type": "application/json",
        ...(auth ? { Authorization: "Bearer admin" } : {}),
      },
      ...(path === "/status" ? {} : { body: JSON.stringify(body) }),
    });
  try {
    const saved = await request("/token", true, {
      url: "https://oauth.vk.com/blank.html#access_token=photo-secret-xxxxxxxxxxxxxxxx&expires_in=86400",
    });
    assert.equal(saved.status, 200);
    const denied = await request("/publish");
    assert.equal(denied.status, 502);
    assert.deepEqual(await denied.json(), {
      error: "TEST_POST_DENIED",
      code: 100,
      method: "wall.post",
      invalidParameters: [],
    });
    denyPost = false;
    assert.equal((await request("/publish")).status, 200);
  } finally {
    server.close();
    globalThis.fetch = realFetch;
    if (priorGroup === undefined) delete process.env.VK_BLACK_TURTLE_TEST_TOKEN;
    else process.env.VK_BLACK_TURTLE_TEST_TOKEN = priorGroup;
  }
});
