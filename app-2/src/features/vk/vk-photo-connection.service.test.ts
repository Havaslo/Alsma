import assert from "node:assert/strict";
import test from "node:test";
import type { Logger } from "pino";

import { createVkPhotoConnectionService } from "./vk-photo-connection.service.js";
import { VkApiError, createVkClient } from "./vk.client.js";

const origin = "https://alsma.ru";
const redirectUri = "https://api.example.test/api/vk-photo-connection/callback";
const photoToken = "server-issued-photo-secret-0123456789";
const logger = { warn: () => undefined } as unknown as Logger;

const setup = () => {
  const rows = new Map<string, { value: unknown; updatedAt: Date }>();
  const database = {
    client: {
      appSetting: {
        findUnique: async ({ where }: { where: { key: string } }) =>
          rows.get(where.key) ?? null,
        create: async ({ data }: { data: { key: string; value: unknown } }) => {
          rows.set(data.key, { value: data.value, updatedAt: new Date() });
        },
        upsert: async ({
          where,
          create,
        }: {
          where: { key: string };
          create: { value: unknown };
        }) => {
          rows.set(where.key, { value: create.value, updatedAt: new Date() });
        },
        deleteMany: async ({
          where,
        }: {
          where: {
            key: string | { startsWith: string };
            updatedAt?: Date | { lt: Date };
          };
        }) => {
          if (typeof where.key !== "string") return { count: 0 };
          const existed = rows.delete(where.key);
          return { count: existed ? 1 : 0 };
        },
      },
    },
  };
  const options = {
    database: database as never,
    configuration: {
      appId: "123",
      appSecret: "app-secret",
      redirectUri,
      encryptionKey: Buffer.alloc(32, 5).toString("base64"),
    },
    allowedOrigins: [origin],
    communityToken: "community-secret",
    groupId: "12345",
    logger,
  };
  return { rows, options, service: createVkPhotoConnectionService(options) };
};

test("server exchanges code, verifies photos, persists encrypted access and rejects replay", async () => {
  const { service, options, rows } = setup();
  const authorization = new URL((await service.start(origin)).authorizationUrl);
  assert.equal(authorization.searchParams.get("response_type"), "code");
  assert.equal(authorization.searchParams.get("scope"), "photos");
  assert.equal(authorization.searchParams.get("redirect_uri"), redirectUri);
  const state = authorization.searchParams.get("state")!;
  assert.ok(!JSON.stringify([...rows.values()]).includes(state));
  const realFetch = globalThis.fetch;
  const methods: string[] = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url === "https://oauth.vk.com/access_token") {
      assert.equal(init?.method, "POST");
      const body = init?.body as URLSearchParams;
      assert.equal(body.get("code"), "one-time-code");
      assert.equal(body.get("client_secret"), "app-secret");
      return Response.json({ access_token: photoToken, expires_in: 3600 });
    }
    const method = new URL(url).pathname.split("/").pop()!;
    methods.push(method);
    assert.equal(
      (init?.body as URLSearchParams).get("access_token"),
      photoToken,
    );
    return Response.json({
      response: { upload_url: "https://upload.vk.test/photo" },
    });
  };
  try {
    assert.deepEqual(await service.complete({ state, code: "one-time-code" }), {
      origin,
      result: "CONNECTED",
    });
    assert.deepEqual(methods, ["photos.getWallUploadServer"]);
    assert.ok(!JSON.stringify([...rows.values()]).includes(photoToken));
    const restarted = createVkPhotoConnectionService(options);
    assert.equal(await restarted.getToken(), photoToken);
    const status = await restarted.status();
    assert.equal(status.photoReady, true);
    assert.ok(status.expiresAt);
    assert.ok(!JSON.stringify(status).includes(photoToken));
    assert.equal(
      (await service.complete({ state, code: "one-time-code" })).result,
      "INVALID_STATE",
    );
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("denied photo grant keeps the previous connection and does not request wall.post", async () => {
  const { service, rows } = setup();
  const prior = {
    ciphertext: "previous-encrypted-value",
    expiresAt: null,
    connectedAt: "2026-01-01",
  };
  rows.set("vk.photo.connection.12345", {
    value: prior,
    updatedAt: new Date(),
  });
  const state = new URL(
    (await service.start(origin)).authorizationUrl,
  ).searchParams.get("state")!;
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (input) =>
    String(input) === "https://oauth.vk.com/access_token"
      ? Response.json({ access_token: photoToken, expires_in: 3600 })
      : Response.json({
          error: {
            error_code: 5,
            error_msg: "access_token was given to another ip address",
          },
        });
  try {
    assert.equal(
      (await service.complete({ state, code: "code" })).result,
      "IP_MISMATCH",
    );
    assert.deepEqual(rows.get("vk.photo.connection.12345")?.value, prior);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("expired connection never falls back to a stale environment token; foreign origin is rejected", async () => {
  const { rows, options } = setup();
  const service = createVkPhotoConnectionService({
    ...options,
    fallbackPhotoToken: "stale-env-token",
  });
  rows.set("vk.photo.connection.12345", {
    value: {
      ciphertext: "unused",
      expiresAt: Date.now() - 1000,
      connectedAt: "2026-01-01",
    },
    updatedAt: new Date(),
  });
  await assert.rejects(service.getToken(), { code: 5 });
  await assert.rejects(service.start("https://attacker.test"), { status: 403 });
  assert.equal(
    (await service.complete({ state: "forged", code: "code" })).result,
    "INVALID_STATE",
  );
});

test("expired, cancelled and concurrent callback states cannot create a connection", async () => {
  const { rows, service } = setup();
  let state = new URL(
    (await service.start(origin)).authorizationUrl,
  ).searchParams.get("state")!;
  for (const row of rows.values())
    (row.value as { expiresAt: number }).expiresAt = 0;
  assert.equal(
    (await service.complete({ state, code: "code" })).result,
    "INVALID_STATE",
  );
  state = new URL(
    (await service.start(origin)).authorizationUrl,
  ).searchParams.get("state")!;
  const results = await Promise.all([
    service.complete({ state, error: "access_denied" }),
    service.complete({ state, error: "access_denied" }),
  ]);
  assert.deepEqual(results.map((r) => r.result).sort(), [
    "AUTHORIZATION_DENIED",
    "INVALID_STATE",
  ]);
  assert.equal(await service.getToken(), undefined);
});

test("VK client resolves the current photo access and retains provider subcode", async () => {
  const realFetch = globalThis.fetch;
  let access = "first-photo-key";
  const tokens: string[] = [];
  globalThis.fetch = async (input) => {
    tokens.push(new URL(String(input)).searchParams.get("access_token")!);
    return Response.json({
      response: { upload_url: "https://upload.vk.test/photo" },
    });
  };
  try {
    const client = createVkClient({
      accessToken: "community",
      getPhotoUploadAccessToken: async () => access,
      logger,
    });
    await client.verifyWallPhotoUpload("12345");
    access = "second-photo-key";
    await client.verifyWallPhotoUpload("12345");
    assert.deepEqual(tokens, ["first-photo-key", "second-photo-key"]);
    globalThis.fetch = async () =>
      Response.json({
        error: {
          error_code: 15,
          error_subcode: 1134,
          error_msg: "non-standalone applications",
        },
      });
    await assert.rejects(
      client.publishWallPost({
        groupId: "12345",
        idempotencyKey: "x",
        text: "text",
        images: [],
      }),
      (error: unknown) =>
        error instanceof VkApiError &&
        error.code === 15 &&
        error.subcode === 1134,
    );
  } finally {
    globalThis.fetch = realFetch;
  }
});
