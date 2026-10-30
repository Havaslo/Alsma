import { createCanvas } from "@napi-rs/canvas";
import assert from "node:assert/strict";
import test from "node:test";
import pino from "pino";

import { encryptInstagramToken } from "./instagram-connection.service.js";
import {
  createInstagramPublishingService,
  resolvePublicMediaBaseUrl,
} from "./instagram-publishing.service.js";

const encryptionKey = Buffer.alloc(32, 7).toString("base64");
const accessToken = "page-access-token";

const createService = (options: {
  readonly mediaBaseUrl?: string;
  readonly onFetch: (request: Record<string, unknown>) => Response;
  readonly storage?: {
    readonly deleteObject: (objectId: string) => Promise<void>;
    readonly getDownload: (
      objectId: string,
    ) => Promise<{ downloadUrl: string }>;
    readonly upload: (input: {
      readonly content: Uint8Array;
      readonly contentType: string;
      readonly name: string;
    }) => Promise<{ objectId: string }>;
  };
}) =>
  createInstagramPublishingService({
    configuration: {
      graphApiVersion: "v26.0",
      proxyKey: "proxy-key",
      proxyUrl: "https://proxy.example",
      publicMediaBaseUrl: options.mediaBaseUrl,
      tokenEncryptionKey: encryptionKey,
    },
    database: {
      client: {
        instagramChannelConnection: {
          findUnique: async () => ({
            connectedAt: new Date("2026-10-01T10:00:00.000Z"),
            encryptedAccessToken: encryptInstagramToken(
              accessToken,
              encryptionKey,
            ),
            instagramUserId: "17841400000000000",
            tokenExpiresAt: new Date("2027-01-01T00:00:00.000Z"),
            username: "alsmannov",
          }),
        },
      },
    } as never,
    fetchImplementation: (async (_input: unknown, init?: RequestInit) => {
      const request = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return options.onFetch(request);
    }) as typeof fetch,
    logger: pino({ level: "silent" }),
    managedStorage: (options.storage ?? {
      deleteObject: async () => {
        throw new Error("unexpected storage delete");
      },
      getDownload: async () => {
        throw new Error("unexpected storage download");
      },
      upload: async () => {
        throw new Error("unexpected storage upload");
      },
    }) as never,
  });

const json = (payload: unknown) =>
  new Response(JSON.stringify(payload), {
    headers: { "content-type": "application/json" },
    status: 200,
  });

test("single-image Instagram post is published from a prepared JPEG", async () => {
  const requests: Array<Record<string, unknown>> = [];
  const service = createService({
    onFetch: (request) => {
      requests.push(request);
      const url = String(request.url);
      if (url.endsWith("/media")) return json({ id: "container-1" });
      if (url.includes("/container-1?"))
        return json({ status_code: "FINISHED" });
      if (url.endsWith("/media_publish")) return json({ id: "media-1" });
      if (url.includes("/media-1?"))
        return json({ permalink: "https://www.instagram.com/p/abc/" });
      throw new Error(`unexpected Instagram request ${url}`);
    },
  });

  const result = await service.publish({
    images: [
      {
        content: new Uint8Array([1, 2, 3]),
        contentType: "image/jpeg",
        downloadUrl: "https://storage.example/photo.jpg",
        fileName: "photo.jpg",
      },
    ],
    text: "Текст поста",
  });

  assert.deepEqual(result, {
    externalId: "media-1",
    url: "https://www.instagram.com/p/abc/",
  });
  const creation = requests.find((request) =>
    String(request.url).endsWith("/media"),
  );
  assert.match(
    String(creation?.body),
    /image_url=https%3A%2F%2Fstorage\.example%2Fphoto\.jpg/u,
  );
  assert.match(String(creation?.body), /caption=/u);
});

test("carousel converts non-JPEG images and removes temporary copies", async () => {
  const canvas = createCanvas(20, 20);
  canvas.getContext("2d").fillRect(0, 0, 20, 20);
  const png = canvas.toBuffer("image/png");
  const uploads: string[] = [];
  const deletions: string[] = [];
  let container = 0;
  const service = createService({
    onFetch: (request) => {
      const url = String(request.url);
      if (url.endsWith("/media")) {
        container += 1;
        return json({ id: `container-${container}` });
      }
      if (url.includes("/media_publish")) return json({ id: "media-2" });
      if (url.includes("container-")) return json({ status_code: "FINISHED" });
      if (url.includes("/media-2?")) return json({ permalink: null });
      throw new Error(`unexpected Instagram request ${url}`);
    },
    storage: {
      deleteObject: async (objectId) => {
        deletions.push(objectId);
      },
      getDownload: async (objectId) => ({
        downloadUrl: `https://storage.example/${objectId}.jpg`,
      }),
      upload: async (input) => {
        uploads.push(input.contentType);
        return { objectId: `temporary-${uploads.length}` };
      },
    },
  });

  const result = await service.publish({
    images: [
      {
        content: new Uint8Array(png),
        contentType: "image/png",
        fileName: "first.png",
      },
      {
        content: new Uint8Array(png),
        contentType: "image/png",
        fileName: "second.png",
      },
    ],
    text: "Карусель",
  });

  assert.deepEqual(result, { externalId: "media-2", url: null });
  assert.deepEqual(uploads, ["image/jpeg", "image/jpeg"]);
  assert.deepEqual(deletions, ["temporary-1", "temporary-2"]);
});

test("public media base keeps a single /api segment", () => {
  assert.equal(
    resolvePublicMediaBaseUrl("https://backend.example/api"),
    "https://backend.example",
  );
  assert.equal(
    resolvePublicMediaBaseUrl("https://backend.example/api/"),
    "https://backend.example",
  );
  assert.equal(
    resolvePublicMediaBaseUrl("https://backend.example/api/api"),
    "https://backend.example",
  );
  assert.equal(
    resolvePublicMediaBaseUrl(" https://backend.example "),
    "https://backend.example",
  );
  assert.equal(resolvePublicMediaBaseUrl(undefined), undefined);
  assert.equal(resolvePublicMediaBaseUrl("   "), undefined);
});

test("feed image link is served from a reachable media URL", async () => {
  const canvas = createCanvas(40, 40);
  canvas.getContext("2d").fillRect(0, 0, 40, 40);
  const jpeg = new Uint8Array(canvas.toBuffer("image/jpeg"));
  const requests: Array<Record<string, unknown>> = [];
  const service = createService({
    mediaBaseUrl: "https://backend.example/api",
    onFetch: (request) => {
      requests.push(request);
      const url = String(request.url);
      if (url.endsWith("/media")) return json({ id: "container-9" });
      if (url.includes("/container-9?"))
        return json({ status_code: "FINISHED" });
      if (url.endsWith("/media_publish")) return json({ id: "media-9" });
      if (url.includes("/media-9?")) return json({ permalink: null });
      throw new Error(`unexpected Instagram request ${url}`);
    },
  });

  await service.publish({
    images: [
      {
        content: jpeg,
        contentType: "image/jpeg",
        fileName: "feed.jpg",
        objectId: "94df1410-a991-42bd-8a0a-dcc8ebd2cd04",
      },
    ],
    text: "Текст поста",
  });

  const creation = requests.find((request) =>
    String(request.url).endsWith("/media"),
  );
  const token = Buffer.from(
    "94df1410-a991-42bd-8a0a-dcc8ebd2cd04",
    "utf8",
  ).toString("base64url");
  assert.match(
    String(creation?.body),
    new RegExp(
      `image_url=${encodeURIComponent(`https://backend.example/api/media/managed/${token}`)}`,
      "u",
    ),
  );
  assert.doesNotMatch(String(creation?.body), /api%2Fapi/u);
});

test("Instagram scheduling fails clearly without a connected account", async () => {
  const service = createInstagramPublishingService({
    configuration: {
      graphApiVersion: "v26.0",
      proxyKey: "proxy-key",
      proxyUrl: "https://proxy.example",
      tokenEncryptionKey: encryptionKey,
    },
    database: {
      client: {
        instagramChannelConnection: { findUnique: async () => null },
      },
    } as never,
    logger: pino({ level: "silent" }),
    managedStorage: {} as never,
  });

  await assert.rejects(service.verifyConnection(), {
    code: "INSTAGRAM_NOT_CONNECTED",
    status: 409,
  });
});
