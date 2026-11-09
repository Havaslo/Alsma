import express from "express";
import assert from "node:assert/strict";
import { once } from "node:events";
import { readFileSync } from "node:fs";
import test from "node:test";
import pino from "pino";

import { createVkPreparedTestRouter } from "./vk-prepared-test.routes.js";

const jpeg = readFileSync(
  new URL("../content-factory/assets/vk-test-photo.jpg", import.meta.url),
);
test("two persisted test cases deliver only to Black Turtle without photo token; receipt prevents repeats", async () => {
  const originalFetch = globalThis.fetch;
  const priorToken = process.env.VK_BLACK_TURTLE_TEST_TOKEN;
  process.env.VK_BLACK_TURTLE_TEST_TOKEN = "test-community";
  const rows = new Map<string, { value: unknown }>();
  const media = [
    "11111111-1111-4111-8111-111111111111",
    "22222222-2222-4222-8222-222222222222",
  ].map((id) => ({
    id,
    objectId: id,
    fileName: "test.jpg",
    contentType: "image/jpeg",
    sizeBytes: jpeg.length,
  }));
  const database = {
    client: {
      contentFactoryMedia: { findMany: async () => media },
      appSetting: {
        findUnique: async ({ where }: any) => rows.get(where.key) ?? null,
        create: async ({ data }: any) => {
          if (rows.has(data.key))
            throw Object.assign(new Error("unique"), { code: "P2002" });
          rows.set(data.key, { value: data.value });
        },
        upsert: async ({ where, create, update }: any) => {
          rows.set(where.key, {
            value: rows.has(where.key) ? update.value : create.value,
          });
        },
        update: async ({ where, data }: any) => {
          rows.set(where.key, { value: data.value });
        },
        deleteMany: async ({ where }: any) => {
          if (where.value) rows.delete(where.key);
        },
      },
    },
  } as never;
  let uploads = 0;
  const posted: string[][] = [];
  globalThis.fetch = (async (input, init) => {
    const url = new URL(String(input));
    if (url.hostname === "storage.example") return new Response(jpeg);
    if (url.hostname === "pu.vk.ru")
      return Response.json({
        server: 1,
        photo: "valid-photo",
        hash: "valid-hash",
      });
    const method = url.pathname.split("/").pop();
    const parameters = new URLSearchParams(String(init?.body));
    if (method === "groups.getById") {
      assert.equal(parameters.get("group_id"), "138003065");
      return Response.json({ response: [{ id: 138003065 }] });
    }
    if (method === "photos.getWallUploadServer") {
      assert.equal(parameters.get("group_id"), "138003065");
      assert.equal(parameters.get("access_token"), "photo-user");
      return Response.json({
        response: {
          upload_url:
            "https://pu.vk.ru/c123/ss456/upload.php?act=do_add&gid=138003065&hash=test&rhash=test",
        },
      });
    }
    if (method === "photos.saveWallPhoto") {
      uploads++;
      return Response.json({
        response: [{ owner_id: -138003065, id: uploads }],
      });
    }
    if (method === "wall.post") {
      assert.equal(parameters.get("access_token"), "test-community");
      assert.equal(parameters.get("owner_id"), "-138003065");
      posted.push(parameters.get("attachments")!.split(","));
      return Response.json({ response: { post_id: 100 + posted.length } });
    }
    throw new Error(`Unexpected method ${method}`);
  }) as typeof fetch;
  const app = express();
  app.use(express.json());
  const base = {
    database,
    storage: {
      getDownload: async () => ({
        downloadUrl: "https://storage.example/photo",
      }),
    } as never,
    logger: pino({ level: "silent" }),
    allowPublishing: true,
  };
  app.use(
    "/prepare-stage",
    createVkPreparedTestRouter({
      ...base,
      getPhotoToken: async () => "photo-user",
    }),
  );
  app.use(
    "/delivery-stage",
    createVkPreparedTestRouter({
      ...base,
      getPhotoToken: async () => {
        throw new Error("Expired token must not be accessed");
      },
    }),
  );
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address() as { port: number };
  const call = async (path: string, body: unknown) => {
    const response = await originalFetch(
      `http://127.0.0.1:${address.port}${path}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    assert.equal(response.status, 200);
    return response.json();
  };
  try {
    const ids = [
      "33333333-3333-4333-8333-333333333333",
      "44444444-4444-4444-8444-444444444444",
    ];
    await call("/prepare-stage/prepare", {
      testId: ids[0],
      text: "One image",
      imageIds: [media[0]!.id],
    });
    await call("/prepare-stage/prepare", {
      testId: ids[1],
      text: "Two images",
      imageIds: media.map((m) => m.id),
    });
    assert.equal(uploads, 2);
    assert.equal(posted.length, 0);
    await call("/delivery-stage/publish", { testId: ids[0] });
    await call("/delivery-stage/publish", { testId: ids[1] });
    await call("/delivery-stage/publish", { testId: ids[1] });
    assert.deepEqual(posted, [
      ["photo-138003065_1"],
      ["photo-138003065_1", "photo-138003065_2"],
    ]);
    assert.equal(uploads, 2);
  } finally {
    globalThis.fetch = originalFetch;
    if (priorToken === undefined) delete process.env.VK_BLACK_TURTLE_TEST_TOKEN;
    else process.env.VK_BLACK_TURTLE_TEST_TOKEN = priorToken;
    server.close();
    await once(server, "close");
  }
});
