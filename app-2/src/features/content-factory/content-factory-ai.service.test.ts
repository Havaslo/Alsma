import { createCanvas, loadImage } from "@napi-rs/canvas";
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

const createReferencePhoto = () => {
  const canvas = createCanvas(320, 480);
  const context = canvas.getContext("2d");
  context.fillStyle = "#315b46";
  context.fillRect(0, 0, canvas.width, canvas.height);
  return canvas.toBuffer("image/png");
};

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
  const referencePhoto = createReferencePhoto();
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
      const userMessage = (
        requestBody.messages as Array<Record<string, unknown>>
      )[1];
      const content = userMessage?.content as Array<Record<string, unknown>>;
      assert.match(String(content[0]?.text), /Тёплая вода/u);
      assert.equal(content[1]?.type, "image_url");
      return Response.json(createTextResponse());
    },
    logger,
    managedStorage: emptyStorage,
  });

  const result = await service.generateText({
    prompt: "Пост о спокойном отдыхе",
    selectedChannels: ["vk", "telegram"],
    sourceTitle: "Тёплая вода и тишина",
    sourceCategory: "SPA",
    sourceTags: ["бассейн", "релакс"],
    referencePhoto,
    referencePhotoContentType: "image/png",
  });

  assert.equal(requestedUrl, "https://gateway.example/v1/chat/completions");
  assert.equal(requestBody.model, "gpt-4.1-mini");
  assert.equal(result.variants.length, 3);
  assert.equal(result.variants[0]?.adaptations.max, "MAX 1");
  const messages = requestBody.messages as Array<Record<string, unknown>>;
  assert.match(String(messages[0]?.content), /2–10/u);
  const userContent = messages[1]?.content as Array<Record<string, unknown>>;
  const imageUrl = userContent[1]?.image_url as { url?: unknown };
  assert.match(String(imageUrl.url), /data:image\/png;base64,/u);
});

test("stores a generated PNG in managed storage and media metadata", async () => {
  const png = createReferencePhoto();
  let storedContentType = "";
  let storedBytes = 0;
  let storedDimensions = { height: 0, width: 0 };
  let createdMedia: Record<string, unknown> = {};
  let requestedPath = "";
  let formValues = new FormData();
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
      const image = await loadImage(Buffer.from(input.content));
      storedDimensions = { height: image.height, width: image.width };
      return { objectId: "generated-object" };
    },
  } as unknown as ManagedStorage;
  const service = createContentFactoryAiService({
    apiKey: "gateway-test-key",
    baseUrl: "https://gateway.example/v1",
    database,
    fetchImplementation: async (url, init) => {
      requestedPath = String(url);
      formValues = init?.body as FormData;
      return Response.json({ data: [{ b64_json: png.toString("base64") }] });
    },
    logger,
    managedStorage,
  });

  const result = await service.generateImage({
    adminId: "admin-id",
    prompt: "Спокойное утро в загородном отеле",
    channel: "instagram",
    sourceTitle: "Номер для спокойного отдыха",
    sourceCategory: "Номера",
    sourceTags: ["интерьер", "комфорт"],
    referencePhoto: png,
    referencePhotoContentType: "image/png",
  });

  assert.equal(requestedPath, "https://gateway.example/v1/images/edits");
  assert.equal(formValues.get("model"), "gpt-image-1.5");
  assert.equal(formValues.get("quality"), "medium");
  assert.equal(formValues.get("size"), "1024x1536");
  assert.match(
    String(formValues.get("prompt")),
    /Номер для спокойного отдыха/u,
  );
  assert.equal(storedContentType, "image/png");
  assert.equal(storedDimensions.width, 1080);
  assert.equal(storedDimensions.height, 1350);
  assert.ok(storedBytes > 0);
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
    service.generateText({
      prompt: "Задача",
      selectedChannels: ["vk"],
      sourceTitle: "Фотография",
      sourceCategory: "SPA",
      sourceTags: [],
      referencePhoto: createReferencePhoto(),
      referencePhotoContentType: "image/png",
    }),
    (error: unknown) =>
      error instanceof Error &&
      "code" in error &&
      error.code === "CONTENT_FACTORY_AI_UNAVAILABLE",
  );
  assert.equal(requestCount, 0);
});

test("refines the publication through the Gateway with task, photo, and custom instruction", async () => {
  const referencePhoto = createCanvas(320, 480).toBuffer("image/jpeg");
  let requestBody: Record<string, unknown> = {};
  const service = createContentFactoryAiService({
    apiKey: "gateway-test-key",
    baseUrl: "https://gateway.example/v1",
    database: {} as Database,
    fetchImplementation: async (_url, init) => {
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return Response.json({
        choices: [
          {
            message: {
              content: JSON.stringify({
                text: "Новый короткий текст",
                adaptations: {
                  vk: "VK-версия",
                  telegram: "Telegram-версия",
                  max: "MAX-версия",
                  instagram: "Instagram-версия",
                  zen: "Версия для Дзена",
                },
              }),
            },
          },
        ],
      });
    },
    logger,
    managedStorage: emptyStorage,
  });

  const result = await service.refineText({
    action: "custom",
    currentText: "Исходный текст публикации",
    customInstruction: "Добавь спокойный призыв к бронированию",
    prompt: "Расскажи о спокойном отдыхе в SPA",
    referencePhotoBase64: referencePhoto.toString("base64"),
    selectedChannels: ["vk", "telegram"],
    sourceTitle: "Тёплая вода и тишина",
    sourceCategory: "SPA",
    sourceTags: ["бассейн", "релакс"],
  });

  assert.equal(result.model, "gpt-4.1-mini");
  assert.equal(result.text, "Новый короткий текст");
  assert.equal(result.adaptations.telegram, "Telegram-версия");
  const messages = requestBody.messages as Array<Record<string, unknown>>;
  const content = messages[1]?.content as Array<Record<string, unknown>>;
  assert.match(String(content[0]?.text), /спокойный призыв к бронированию/u);
  assert.match(String(content[0]?.text), /Исходный текст публикации/u);
  const imageUrl = content[1]?.image_url as { url?: unknown };
  assert.match(String(imageUrl.url), /^data:image\/jpeg;base64,/u);
});

test("rejects a source photo with a mismatched content type before Gateway use", async () => {
  let requestCount = 0;
  const service = createContentFactoryAiService({
    apiKey: "gateway-test-key",
    baseUrl: "https://gateway.example/v1",
    database: {} as Database,
    fetchImplementation: async () => {
      requestCount += 1;
      return Response.json({});
    },
    logger,
    managedStorage: emptyStorage,
  });

  await assert.rejects(
    service.generateImage({
      adminId: "admin-id",
      prompt: "Оставить как есть",
      channel: "vk",
      sourceTitle: "Фото",
      sourceCategory: "SPA",
      sourceTags: [],
      referencePhoto: Buffer.from("not-an-image"),
      referencePhotoContentType: "image/jpeg",
    }),
    (error: unknown) =>
      error instanceof Error &&
      "code" in error &&
      error.code === "CONTENT_FACTORY_REFERENCE_PHOTO_INVALID",
  );
  assert.equal(requestCount, 0);
});
