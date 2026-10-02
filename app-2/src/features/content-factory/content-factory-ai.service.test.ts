import assert from "node:assert/strict";
import { test } from "node:test";
import type { Logger } from "pino";

import type { Database } from "../../lib/database/database.js";
import type { ManagedStorage } from "../../lib/storage/managed-storage.js";
import { createContentFactoryAiService } from "./content-factory-ai.service.js";

const logger = {
  error() {},
  warn() {},
} as unknown as Logger;

const emptyStorage = {
  deleteObject: async () => undefined,
  upload: async () => ({ objectId: "generated-object" }),
} as unknown as ManagedStorage;

const createTextResponse = () => ({
  choices: [
    {
      message: {
        content: JSON.stringify({
          variants: [1, 2, 3].map((number) => ({
            adaptations: {
              instagram: `Instagram ${number}`,
              max: `MAX ${number}`,
              telegram: `Telegram ${number}`,
              vk: `VK ${number}`,
              zen: `Дзен ${number}`,
            },
            concept: `Идея ${number}`,
            text: `Текст ${number}`,
            title: `Заголовок ${number}`,
          })),
        }),
      },
    },
  ],
});

test("generates three structured draft variants through the Gateway", async () => {
  let requestedUrl = "";
  let requestBody: Record<string, unknown> = {};
  const service = createContentFactoryAiService({
    apiKey: "gateway-test-key",
    baseUrl: "https://gateway.example/v1/",
    database: {} as Database,
    fetchImplementation: async (url, init) => {
      requestedUrl = String(url);
      assert.equal(
        new Headers(init?.headers).get("authorization"),
        "Bearer gateway-test-key",
      );
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return Response.json(createTextResponse());
    },
    logger,
    managedStorage: emptyStorage,
  });

  const result = await service.generateText({
    prompt: "Пост о спокойном отдыхе",
    selectedChannels: ["vk", "telegram"],
  });

  assert.equal(requestedUrl, "https://gateway.example/v1/chat/completions");
  assert.equal(requestBody.model, "gpt-4.1-mini");
  assert.equal(result.variants.length, 3);
  assert.equal(result.variants[0]?.adaptations.max, "MAX 1");
});

test("stores a generated PNG in managed storage and media metadata", async () => {
  const png = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
  ]);
  let storedContentType = "";
  let storedBytes = 0;
  let createdMedia: Record<string, unknown> = {};
  const database = {
    client: {
      contentFactoryMedia: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          createdMedia = data;
          return {
            ...data,
            createdAt: new Date("2026-10-02T10:00:00.000Z"),
            id: "generated-media-id",
          };
        },
      },
    },
  } as unknown as Database;
  const managedStorage = {
    deleteObject: async () => undefined,
    upload: async (input: { content: Uint8Array; contentType: string }) => {
      storedContentType = input.contentType;
      storedBytes = input.content.byteLength;
      return { objectId: "generated-object" };
    },
  } as unknown as ManagedStorage;
  const service = createContentFactoryAiService({
    apiKey: "gateway-test-key",
    baseUrl: "https://gateway.example/v1",
    database,
    fetchImplementation: async () =>
      Response.json({ data: [{ b64_json: png.toString("base64") }] }),
    logger,
    managedStorage,
  });

  const result = await service.generateImage({
    adminId: "admin-id",
    prompt: "Спокойное утро в загородном отеле",
  });

  assert.equal(storedContentType, "image/png");
  assert.equal(storedBytes, png.length);
  assert.equal(createdMedia.createdById, "admin-id");
  assert.equal(createdMedia.objectId, "generated-object");
  assert.equal(result.id, "generated-media-id");
});

test("does not call the provider when the Gateway is not configured", async () => {
  let requestCount = 0;
  const service = createContentFactoryAiService({
    database: {} as Database,
    fetchImplementation: async () => {
      requestCount += 1;
      return Response.json({});
    },
    logger,
    managedStorage: emptyStorage,
  });

  await assert.rejects(
    service.generateText({ prompt: "Задача", selectedChannels: ["vk"] }),
    (error: unknown) =>
      error instanceof Error &&
      "code" in error &&
      error.code === "CONTENT_FACTORY_AI_UNAVAILABLE",
  );
  assert.equal(requestCount, 0);
});
