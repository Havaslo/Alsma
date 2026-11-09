import assert from "node:assert/strict";
import test from "node:test";
import type { Logger } from "pino";

import { createVkIdPhotoService } from "./vk-id-photo.service.js";
import { unseal } from "./vk-photo-crypto.js";

const origin = "https://alsma.ru";
const encryptionKey = Buffer.alloc(32, 8).toString("base64");
const setup = () => {
  const rows = new Map<string, { value: any; updatedAt: Date }>();
  const table = {
    findUnique: async ({ where }: any) => rows.get(where.key) ?? null,
    create: async ({ data }: any) => {
      rows.set(data.key, { value: data.value, updatedAt: new Date() });
    },
    upsert: async ({ where, create, update }: any) => {
      rows.set(where.key, {
        value: rows.has(where.key) ? update.value : create.value,
        updatedAt: new Date(),
      });
    },
    update: async ({ where, data }: any) => {
      rows.set(where.key, { value: data.value, updatedAt: new Date() });
    },
    deleteMany: async ({ where }: any) => {
      if (typeof where.key !== "string") return { count: 0 };
      const row = rows.get(where.key);
      if (!row || (where.updatedAt && row.updatedAt !== where.updatedAt))
        return { count: 0 };
      rows.delete(where.key);
      return { count: 1 };
    },
  };
  let tail = Promise.resolve();
  let locks = 0;
  const database = {
    client: {
      appSetting: table,
      $transaction: async (fn: any) => {
        const previous = tail;
        let release!: () => void;
        tail = new Promise<void>((resolve) => {
          release = resolve;
        });
        await previous;
        try {
          return await fn({
            appSetting: table,
            $executeRaw: async () => {
              locks++;
            },
          });
        } finally {
          release();
        }
      },
    },
  };
  const options = {
    database: database as never,
    appId: "123",
    redirectUri:
      "https://api.example.test/api/vk-photo-connection/vkid/callback",
    encryptionKey,
    allowedOrigins: [origin],
    groupId: "456",
    communityToken: "community",
    logger: { warn: () => undefined } as unknown as Logger,
  };
  return {
    rows,
    options,
    service: createVkIdPhotoService(options),
    locks: () => locks,
  };
};
const access = (n: number) => `access-private-token-${n}-0123456789`;
const refresh = (n: number) => `refresh-private-token-${n}-0123456789`;

test("PKCE exchange verifies photos and real refresh before activation; state is single-use", async () => {
  const { service, rows } = setup();
  const old = globalThis.fetch;
  let requests = 0,
    photoChecks = 0;
  const url = new URL((await service.start(origin, "admin1")).authorizationUrl);
  const state = url.searchParams.get("state")!;
  assert.equal(url.origin, "https://id.vk.ru");
  assert.equal(url.searchParams.get("scope"), "photos");
  assert.equal(url.searchParams.get("code_challenge_method"), "s256");
  assert.ok(!JSON.stringify([...rows.values()]).includes(state));
  globalThis.fetch = (async (input, init) => {
    const body = init!.body as URLSearchParams;
    if (String(input) === "https://id.vk.ru/oauth2/auth") {
      requests++;
      if (requests === 1) {
        assert.equal(body.get("grant_type"), "authorization_code");
        assert.ok(body.get("code_verifier"));
      } else {
        assert.equal(body.get("grant_type"), "refresh_token");
        assert.equal(body.get("refresh_token"), refresh(1));
        assert.equal(body.get("device_id"), "device-private");
      }
      return Response.json({
        access_token: access(requests),
        refresh_token: refresh(requests),
        expires_in: 3600,
        scope: "photos",
        state: body.get("state"),
        user_id: 123,
      });
    }
    photoChecks++;
    assert.equal(
      new URL(String(input)).pathname,
      "/method/photos.getWallUploadServer",
    );
    return Response.json({
      response: { upload_url: "https://pu.vk.ru/upload" },
    });
  }) as typeof fetch;
  try {
    assert.equal(
      (
        await service.complete({
          state,
          code: "code",
          device_id: "device-private",
        })
      ).result,
      "VKID_CONNECTED",
    );
    assert.equal(requests, 2);
    assert.equal(photoChecks, 2);
    assert.equal(await service.getToken(), access(2));
    assert.equal(
      (
        await service.complete({
          state,
          code: "code",
          device_id: "device-private",
        })
      ).result,
      "INVALID_STATE",
    );
    const serialized = JSON.stringify([...rows.values()]);
    assert.ok(!serialized.includes(access(2)));
    assert.ok(!serialized.includes(refresh(2)));
    assert.ok(!serialized.includes("device-private"));
    const status = await service.status();
    assert.equal(status.autoRenewal, true);
    assert.equal(status.lastExchange?.grantType, "refresh_token");
    assert.equal(status.lastExchange?.expiresIn, 3600);
    assert.equal(status.lastExchange?.refreshTokenPresent, true);
    assert.deepEqual(status.lastExchange?.scopes, ["photos"]);
    assert.ok(!JSON.stringify(status).includes(access(2)));
  } finally {
    globalThis.fetch = old;
  }
});

test("missing photos, rejected refresh and invalid state never activate a candidate", async () => {
  const old = globalThis.fetch;
  try {
    for (const failure of [
      "scope",
      "refresh",
      "state",
      "photo",
      "refreshed_photo",
      "save",
    ]) {
      const { service, rows, options } = setup();
      if (failure === "save") {
        const originalUpsert = (options.database as any).client.appSetting
          .upsert;
        (options.database as any).client.appSetting.upsert = async (
          args: any,
        ) => {
          if (args.where.key === "vk.photo.vkid.456")
            throw new Error("mock storage unavailable");
          return originalUpsert(args);
        };
      }
      rows.set("vk.photo.connection.456", {
        value: { ciphertext: "existing-legacy" },
        updatedAt: new Date(),
      });
      const state = new URL(
        (await service.start(origin, "admin1")).authorizationUrl,
      ).searchParams.get("state")!;
      let n = 0;
      globalThis.fetch = (async (input, init) => {
        if (String(input) === "https://id.vk.ru/oauth2/auth") {
          n++;
          if (failure === "refresh" && n === 2)
            return Response.json({ error: "invalid_grant" });
          return Response.json({
            access_token: access(n),
            refresh_token: refresh(n),
            expires_in: 3600,
            scope: failure === "scope" ? "email" : "photos",
            state:
              failure === "state"
                ? "wrong"
                : (init!.body as URLSearchParams).get("state"),
            user_id: 123,
          });
        }
        if (failure === "photo" || (failure === "refreshed_photo" && n === 2))
          return Response.json({
            error: { error_code: 15, error_msg: "denied" },
          });
        return Response.json({
          response: { upload_url: "https://pu.vk.ru/upload" },
        });
      }) as typeof fetch;
      assert.notEqual(
        (await service.complete({ state, code: "code", device_id: "device" }))
          .result,
        "VKID_CONNECTED",
      );
      const attempt = (await service.status()).lastAttempt!;
      assert.equal(
        attempt.stage,
        failure === "refresh"
          ? "refresh"
          : failure === "photo"
            ? "photo_access"
            : failure === "refreshed_photo"
              ? "refreshed_photo_access"
              : failure === "save"
                ? "save"
                : "code_exchange",
      );
      assert.ok(!JSON.stringify(attempt).includes(access(1)));
      assert.ok(!JSON.stringify(attempt).includes(refresh(1)));
      const evidence = (await service.status()).lastExchange;
      if (failure === "scope") assert.deepEqual(evidence?.scopes, ["email"]);
      assert.equal(rows.has("vk.photo.vkid.456"), false);
      assert.equal(
        rows.get("vk.photo.connection.456")!.value.ciphertext,
        "existing-legacy",
      );
    }
  } finally {
    globalThis.fetch = old;
  }
});

test("replicas serialize refresh, rotate both tokens and reuse the committed result", async () => {
  const { service, options, rows, locks } = setup();
  const other = createVkIdPhotoService(options);
  const old = globalThis.fetch;
  let n = 0;
  globalThis.fetch = (async (input, init) => {
    if (String(input) !== "https://id.vk.ru/oauth2/auth")
      return Response.json({
        response: { upload_url: "https://pu.vk.ru/upload" },
      });
    n++;
    const body = init!.body as URLSearchParams;
    if (n === 3) assert.equal(body.get("refresh_token"), refresh(2));
    return Response.json({
      access_token: access(n),
      refresh_token: refresh(n),
      expires_in: 3600,
      scope: "photos",
      state: body.get("state"),
      user_id: 123,
    });
  }) as typeof fetch;
  try {
    const state = new URL(
      (await service.start(origin, "admin1")).authorizationUrl,
    ).searchParams.get("state")!;
    await service.complete({ state, code: "code", device_id: "device" });
    rows.get("vk.photo.vkid.456")!.value.expiresAt = Date.now() + 119000;
    assert.deepEqual(
      await Promise.all([service.getToken(), other.getToken()]),
      [access(3), access(3)],
    );
    assert.equal(n, 3);
    assert.equal(locks(), 3);
    const stored = JSON.parse(
      unseal(rows.get("vk.photo.vkid.456")!.value.ciphertext, encryptionKey),
    );
    assert.equal(stored.refreshToken, refresh(3));
    assert.deepEqual(
      await Promise.all([
        service.getToken(access(3)),
        other.getToken(access(3)),
      ]),
      [access(4), access(4)],
    );
    assert.equal(n, 4);
    assert.equal(await service.getToken(), access(4));
    rows.get("vk.photo.vkid.456")!.value.expiresAt = Date.now() - 1000;
    globalThis.fetch = (async () =>
      Response.json({ error: "invalid_grant" })) as typeof fetch;
    await assert.rejects(
      service.getToken(),
      (error: any) => error.code === "VKID_REFRESH_FAILED",
    );
    assert.equal(
      JSON.parse(
        unseal(rows.get("vk.photo.vkid.456")!.value.ciphertext, encryptionKey),
      ).refreshToken,
      refresh(4),
    );
  } finally {
    globalThis.fetch = old;
  }
});

test("unconfigured service leaves legacy path alone and foreign origins are rejected", async () => {
  const { options, service } = setup();
  assert.equal(
    await createVkIdPhotoService({ ...options, appId: undefined }).getToken(),
    null,
  );
  await assert.rejects(service.start("https://evil.test", "admin"));
  assert.equal(
    (
      await service.complete({
        state: "unknown",
        code: "code",
        device_id: "device",
      })
    ).result,
    "INVALID_STATE",
  );
});

test("backend-only publication refreshes saved VK ID credentials and keeps community wall auth", async () => {
  const { createVkClient } = await import("./vk.client.js");
  const { service, rows, options } = setup();
  const original = globalThis.fetch;
  let exchanges = 0,
    wallWrites = 0;
  let publishing = false;
  let saveRejected = false;
  const photoTokens: string[] = [];
  globalThis.fetch = (async (input, init) => {
    const url = String(input);
    if (url === "https://upload.vk.test/photo")
      return Response.json({ server: 1, photo: "uploaded", hash: "hash" });
    const body = init!.body as URLSearchParams;
    if (url === "https://id.vk.ru/oauth2/auth") {
      exchanges++;
      return Response.json({
        access_token: access(exchanges),
        refresh_token: refresh(exchanges),
        expires_in: 3600,
        scope: "photos",
        state: body.get("state"),
        user_id: 123,
      });
    }
    const method = new URL(url).pathname.split("/").pop();
    if (
      method === "photos.getWallUploadServer" ||
      method === "photos.saveWallPhoto"
    ) {
      if (publishing) photoTokens.push(body.get("access_token")!);
      if (publishing && method === "photos.saveWallPhoto" && !saveRejected) {
        saveRejected = true;
        return Response.json({
          error: { error_code: 5, error_msg: "expired" },
        });
      }
      return Response.json({
        response:
          method === "photos.getWallUploadServer"
            ? { upload_url: "https://upload.vk.test/photo" }
            : [{ owner_id: -456, id: 7 }],
      });
    }
    if (method === "wall.post") {
      wallWrites++;
      assert.equal(body.get("access_token"), "community");
      assert.ok(body.get("guid"));
      return Response.json({ response: { post_id: 8 } });
    }
    assert.equal(method, "wall.getById");
    return Response.json({
      response: [
        {
          id: 8,
          owner_id: -456,
          attachments: [{ type: "photo", photo: { owner_id: -456, id: 7 } }],
        },
      ],
    });
  }) as typeof fetch;
  try {
    const state = new URL(
      (await service.start(origin, "admin")).authorizationUrl,
    ).searchParams.get("state")!;
    assert.equal(
      (await service.complete({ state, code: "test", device_id: "device" }))
        .result,
      "VKID_CONNECTED",
    );
    rows.get("vk.photo.vkid.456")!.value.expiresAt = Date.now() + 60000;
    publishing = true;
    const restarted = createVkIdPhotoService(options);
    const client = createVkClient({
      accessToken: "community",
      logger: options.logger,
      getPhotoUploadAccessToken: async () =>
        (await restarted.getToken()) ?? undefined,
      refreshPhotoUploadAccessToken: restarted.getToken,
    });
    const result = await client.publishWallPost({
      groupId: "456",
      idempotencyKey: "one-publication",
      text: "Mock publication",
      images: [
        {
          content: new Uint8Array([1]),
          contentType: "image/jpeg",
          fileName: "test.jpg",
        },
      ],
    });
    assert.equal(result.attachedImages, 1);
    assert.equal(exchanges, 4);
    assert.equal(wallWrites, 1);
    assert.deepEqual(photoTokens, [access(3), access(3), access(4)]);
  } finally {
    globalThis.fetch = original;
  }
});
