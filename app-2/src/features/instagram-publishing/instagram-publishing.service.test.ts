import { createCanvas, loadImage } from "@napi-rs/canvas";
import assert from "node:assert/strict";
import test from "node:test";
import pino from "pino";

import { encryptInstagramToken } from "./instagram-connection.service.js";
import { MetaGraphRequestError } from "./instagram-graph.client.js";
import {
  createInstagramPublishingService,
  resolvePublicMediaBaseUrl,
} from "./instagram-publishing.service.js";

const encryptionKey = Buffer.alloc(32, 7).toString("base64");
const accessToken = "page-access-token";

const createService = (options: {
  readonly mediaBaseUrl?: string;
  readonly mediaProxyUrl?: string;
  readonly onFetch: (request: Record<string, unknown>) => Response;
  readonly onHead?: (url: string) => Response;
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
      mediaProxyUrl: options.mediaProxyUrl,
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
    fetchImplementation: (async (input: unknown, init?: RequestInit) => {
      if (!init?.body)
        return options.onHead?.(String(input)) ?? imageResponse();
      const request = JSON.parse(String(init.body)) as Record<string, unknown>;
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

const imageResponse = () =>
  new Response(null, {
    headers: { "content-type": "image/jpeg" },
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

test("converted JPEG keeps photographic detail", async () => {
  const width = 1080;
  const height = 1350;
  const canvas = createCanvas(width, height);
  const context = canvas.getContext("2d");
  const original = context.createImageData(width, height);
  let seed = 987654321;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
      const noise = (seed % 41) - 20;
      const offset = (y * width + x) * 4;
      original.data[offset] = Math.max(
        0,
        Math.min(255, Math.round((x / width) * 255) + noise),
      );
      original.data[offset + 1] = Math.max(
        0,
        Math.min(255, Math.round((y / height) * 255) + noise),
      );
      original.data[offset + 2] = Math.max(0, Math.min(255, 128 + noise));
      original.data[offset + 3] = 255;
    }
  }
  context.putImageData(original, 0, 0);

  let uploaded: Uint8Array | null = null;
  const service = createService({
    onFetch: (request) => {
      const url = String(request.url);
      if (url.endsWith("/media")) return json({ id: "container-quality" });
      if (url.includes("/container-quality?"))
        return json({ status_code: "FINISHED" });
      if (url.includes("/media_publish")) return json({ id: "media-quality" });
      if (url.includes("/media-quality?")) return json({ permalink: null });
      throw new Error(`unexpected Instagram request ${url}`);
    },
    storage: {
      deleteObject: async () => undefined,
      getDownload: async () => ({
        downloadUrl: "https://storage.example/quality.jpg",
      }),
      upload: async (input) => {
        uploaded = input.content;
        return { objectId: "temporary-quality" };
      },
    },
  });

  await service.publish({
    images: [
      {
        content: new Uint8Array(canvas.toBuffer("image/png")),
        contentType: "image/png",
        fileName: "detail.png",
      },
    ],
    text: "Проверка качества",
  });

  assert.ok(uploaded, "the prepared JPEG should be uploaded");
  const decoded = await loadImage(Buffer.from(uploaded));
  assert.equal(decoded.width, width);
  assert.equal(decoded.height, height);
  const decodedCanvas = createCanvas(width, height);
  const decodedContext = decodedCanvas.getContext("2d");
  decodedContext.drawImage(decoded, 0, 0);
  const actual = decodedContext.getImageData(0, 0, width, height);
  let squaredError = 0;
  for (let index = 0; index < original.data.length; index += 4) {
    for (let channel = 0; channel < 3; channel += 1) {
      const difference =
        (original.data[index + channel] ?? 0) -
        (actual.data[index + channel] ?? 0);
      squaredError += difference * difference;
    }
  }
  const meanSquaredError = squaredError / (width * height * 3);
  const psnr = 10 * Math.log10((255 * 255) / meanSquaredError);
  assert.ok(
    psnr > 32,
    `converted JPEG quality is too low (PSNR ${psnr.toFixed(1)} dB)`,
  );
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

test("normalized temporary images use a signed storage download URL", async () => {
  const canvas = createCanvas(40, 40);
  canvas.getContext("2d").fillRect(0, 0, 40, 40);
  const png = new Uint8Array(canvas.toBuffer("image/png"));
  const requests: Array<Record<string, unknown>> = [];
  const deleted: string[] = [];
  const service = createService({
    mediaBaseUrl: "https://backend.example",
    onFetch: (request) => {
      requests.push(request);
      const url = String(request.url);
      if (url.endsWith("/media")) return json({ id: "container-temp" });
      if (url.includes("/container-temp?"))
        return json({ status_code: "FINISHED" });
      if (url.endsWith("/media_publish")) return json({ id: "media-temp" });
      if (url.includes("/media-temp?")) return json({ permalink: null });
      throw new Error(`unexpected Instagram request ${url}`);
    },
    storage: {
      upload: async () => ({ objectId: "temporary-image" }),
      getDownload: async (objectId) => ({
        downloadUrl: `https://storage.example/${objectId}?signature=private`,
      }),
      deleteObject: async (objectId) => {
        deleted.push(objectId);
      },
    },
  });

  await service.publish({
    images: [
      {
        content: png,
        contentType: "image/png",
        fileName: "source.png",
        objectId: "original-image",
      },
    ],
    text: "Проверка JPEG",
  });

  const creation = requests.find((request) =>
    String(request.url).endsWith("/media"),
  );
  assert.equal(
    new URLSearchParams(String(creation?.body)).get("image_url"),
    "https://storage.example/temporary-image?signature=private",
  );
  assert.deepEqual(deleted, ["temporary-image"]);
});

test("Instagram errors do not expose signed media URL query parameters", async () => {
  const canvas = createCanvas(40, 40);
  canvas.getContext("2d").fillRect(0, 0, 40, 40);
  const png = new Uint8Array(canvas.toBuffer("image/png"));
  const service = createService({
    onFetch: () =>
      Response.json(
        { error: { message: "Only photo or video can be accepted" } },
        { status: 400 },
      ),
    storage: {
      upload: async () => ({ objectId: "temporary-image" }),
      getDownload: async () => ({
        downloadUrl:
          "https://storage.example/temporary-image?signature=private",
      }),
      deleteObject: async () => undefined,
    },
  });

  await assert.rejects(
    service.publish({
      images: [
        {
          content: png,
          contentType: "image/png",
          fileName: "source.png",
        },
      ],
      text: "Проверка ошибки",
    }),
    (error: unknown) => {
      assert.ok(error instanceof MetaGraphRequestError);
      assert.match(
        error.providerMessage ?? "",
        /storage\.example\/temporary-image/u,
      );
      assert.doesNotMatch(error.providerMessage ?? "", /signature=private/u);
      return true;
    },
  );
});

test("Instagram uses the inbound proxy for existing and temporary images", async () => {
  const canvas = createCanvas(40, 40);
  canvas.getContext("2d").fillRect(0, 0, 40, 40);
  const jpeg = new Uint8Array(canvas.toBuffer("image/jpeg"));
  const png = new Uint8Array(canvas.toBuffer("image/png"));
  const proxy = "https://gateway.example/v1/inbound-proxy/route-id";
  const requests: Array<Record<string, unknown>> = [];
  const uploaded: string[] = [];
  const deleted: string[] = [];
  let container = 0;
  const service = createService({
    mediaBaseUrl: "https://backend.example/api",
    mediaProxyUrl: `${proxy}/`,
    onFetch: (request) => {
      requests.push(request);
      const url = String(request.url);
      if (url.endsWith("/media"))
        return json({ id: `container-${++container}` });
      if (url.includes("/media_publish")) return json({ id: "media-1" });
      if (url.includes("container-")) return json({ status_code: "FINISHED" });
      if (url.includes("/media-1?")) return json({ permalink: null });
      throw new Error(`unexpected Instagram request ${url}`);
    },
    storage: {
      upload: async () => {
        const id = `temporary-${uploaded.length + 1}`;
        uploaded.push(id);
        return { objectId: id };
      },
      getDownload: async () => {
        return {
          downloadUrl:
            "https://storage.example/temporary.jpg?signature=private",
        };
      },
      deleteObject: async (id) => {
        deleted.push(id);
      },
    },
  });

  await service.publish({
    images: [
      {
        content: jpeg,
        contentType: "image/jpeg",
        fileName: "existing.jpg",
        objectId: "existing-id",
      },
      {
        content: png,
        contentType: "image/png",
        fileName: "converted.png",
        objectId: "original-id",
      },
      {
        content: jpeg,
        contentType: "image/jpeg",
        fileName: "no-id.jpg",
        downloadUrl: "https://storage.example/photo.jpg",
      },
    ],
    text: "Карусель",
  });

  const mediaRequests = requests.filter((request) =>
    String(request.url).endsWith("/media"),
  );
  const imageUrls = mediaRequests
    .map((request) =>
      new URLSearchParams(String(request.body)).get("image_url"),
    )
    .filter((url): url is string => Boolean(url));
  assert.deepEqual(imageUrls, [
    `${proxy}/${Buffer.from("existing-id").toString("base64url")}`,
    `${proxy}/${Buffer.from("temporary-1").toString("base64url")}`,
    `${proxy}/${Buffer.from("temporary-2").toString("base64url")}`,
  ]);
  assert.deepEqual(uploaded, ["temporary-1", "temporary-2"]);
  assert.deepEqual(deleted, uploaded);
});

test("Instagram does not bypass a configured proxy when a temporary JPEG probe fails", async () => {
  const canvas = createCanvas(40, 40);
  canvas.getContext("2d").fillRect(0, 0, 40, 40);
  const png = new Uint8Array(canvas.toBuffer("image/png"));
  const proxy = "https://gateway.example/v1/inbound-proxy/route-id";
  const originalToken = Buffer.from("original-id").toString("base64url");
  const deleted: string[] = [];
  const service = createService({
    mediaBaseUrl: "https://backend.example",
    mediaProxyUrl: proxy,
    onFetch: () => {
      throw new Error(
        "Meta must not be called when temporary media is unavailable",
      );
    },
    onHead: (url) =>
      url.endsWith(`/${originalToken}`)
        ? imageResponse()
        : new Response(null, { status: 403 }),
    storage: {
      upload: async () => ({ objectId: "temporary-image" }),
      getDownload: async () => {
        throw new Error(
          "a configured proxy must not fall back to Storage URLs",
        );
      },
      deleteObject: async (objectId) => {
        deleted.push(objectId);
      },
    },
  });

  await assert.rejects(
    service.publish({
      images: [
        {
          content: png,
          contentType: "image/png",
          fileName: "source.png",
          objectId: "original-id",
        },
      ],
      text: "Проверка прокси",
    }),
    { code: "INSTAGRAM_MEDIA_PROXY_UNAVAILABLE", status: 502 },
  );
  assert.deepEqual(deleted, ["temporary-image"]);
});

test("Instagram falls back to the backend URL when the media proxy fails", async () => {
  const canvas = createCanvas(40, 40);
  canvas.getContext("2d").fillRect(0, 0, 40, 40);
  const jpeg = new Uint8Array(canvas.toBuffer("image/jpeg"));
  const proxy = "https://gateway.example/v1/inbound-proxy/route-id";
  const requests: Array<Record<string, unknown>> = [];
  let container = 0;
  const service = createService({
    mediaBaseUrl: "https://backend.example",
    mediaProxyUrl: proxy,
    onFetch: (request) => {
      requests.push(request);
      const url = String(request.url);
      if (url.endsWith("/media"))
        return json({ id: `container-${++container}` });
      if (url.includes("/media_publish")) return json({ id: "media-1" });
      if (url.includes("container-")) return json({ status_code: "FINISHED" });
      if (url.includes("/media-1?")) return json({ permalink: null });
      throw new Error(`unexpected Instagram request ${url}`);
    },
    onHead: () => new Response(null, { status: 403 }),
  });

  await service.publish({
    images: [
      {
        content: jpeg,
        contentType: "image/jpeg",
        fileName: "existing.jpg",
        objectId: "existing-id",
      },
    ],
    text: "Текст поста",
  });

  const creation = requests.find((request) =>
    String(request.url).endsWith("/media"),
  );
  const token = Buffer.from("existing-id", "utf8").toString("base64url");
  assert.equal(
    new URLSearchParams(String(creation?.body)).get("image_url"),
    `https://backend.example/api/media/managed/${token}`,
  );
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
