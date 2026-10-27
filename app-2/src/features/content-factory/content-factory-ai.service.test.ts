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

const createSolidImage = (width: number, height: number, color: string) => {
  const canvas = createCanvas(width, height);
  const context = canvas.getContext("2d");
  context.fillStyle = color;
  context.fillRect(0, 0, width, height);
  return canvas.toBuffer("image/png");
};

const createTextResponse = (includeBlog = true) => ({
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
              ...(includeBlog ? { blog: `Статья для блога ${number}` } : {}),
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
    selectedChannels: ["vk", "telegram", "blog"],
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
  assert.equal(result.variants[0]?.adaptations.blog, "Статья для блога 1");
  const messages = requestBody.messages as Array<Record<string, unknown>>;
  assert.match(String(messages[0]?.content), /2–10/u);
  const userContent = messages[1]?.content as Array<Record<string, unknown>>;
  const imageUrl = userContent[1]?.image_url as { url?: unknown };
  assert.match(String(imageUrl.url), /data:image\/png;base64,/u);
});

test("falls back to the article adaptation when Gateway omits the new blog field", async () => {
  const service = createContentFactoryAiService({
    apiKey: "gateway-test-key",
    baseUrl: "https://gateway.example/v1",
    database: {} as Database,
    fetchImplementation: async () => Response.json(createTextResponse(false)),
    logger,
    managedStorage: emptyStorage,
  });

  const result = await service.generateText({
    prompt: "Полезная статья для сайта",
    selectedChannels: ["blog"],
    sourceTitle: "",
    sourceCategory: "",
    sourceTags: [],
  });

  assert.equal(result.variants[0]?.adaptations.blog, "Дзен 1");
});

test("generates and stores each requested image for every selected channel format", async () => {
  const png = createReferencePhoto();
  const secondPng = createReferencePhoto();
  const storedContentTypes: string[] = [];
  const storedDimensions: Array<{ height: number; width: number }> = [];
  const createdMedia: Array<Record<string, unknown>> = [];
  const requestedPaths: string[] = [];
  const imageRequests: Array<{
    imageCount: FormDataEntryValue | null;
    images: FormDataEntryValue[];
    mask: FormDataEntryValue | null;
    model: FormDataEntryValue | null;
    prompt: string;
    quality: FormDataEntryValue | null;
    size: FormDataEntryValue | null;
  }> = [];
  const database = {
    client: {
      contentFactoryMedia: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          createdMedia.push(data);
          return {
            ...data,
            createdAt: new Date("2026-10-02T10:00:00.000Z"),
            id: `generated-media-${createdMedia.length}`,
          };
        },
      },
    },
  } as unknown as Database;
  const managedStorage = {
    deleteObject: async () => undefined,
    upload: async (input: { content: Uint8Array; contentType: string }) => {
      storedContentTypes.push(input.contentType);
      const image = await loadImage(Buffer.from(input.content));
      storedDimensions.push({ height: image.height, width: image.width });
      return { objectId: `generated-object-${storedDimensions.length}` };
    },
  } as unknown as ManagedStorage;
  const service = createContentFactoryAiService({
    apiKey: "gateway-test-key",
    baseUrl: "https://gateway.example/v1",
    database,
    fetchImplementation: async (url, init) => {
      requestedPaths.push(String(url));
      const formValues = init?.body as FormData;
      imageRequests.push({
        imageCount: formValues.get("n"),
        images: formValues.getAll("image[]"),
        mask: formValues.get("mask"),
        model: formValues.get("model"),
        prompt: String(formValues.get("prompt")),
        quality: formValues.get("quality"),
        size: formValues.get("size"),
      });
      const [width, height] = String(formValues.get("size"))
        .split("x")
        .map(Number);
      const generatedImage = createSolidImage(width!, height!, "#315b46");
      return Response.json({
        data: Array.from({ length: Number(formValues.get("n")) }, () => ({
          b64_json: generatedImage.toString("base64"),
        })),
      });
    },
    logger,
    managedStorage,
  });

  const result = await service.generateImage({
    adminId: "admin-id",
    imageCount: 2,
    mode: "edit",
    postText: "Время для спокойного отдыха в загородном отеле",
    prompt: "Мягкий утренний свет",
    selectedChannels: ["instagram", "vk", "telegram", "max", "zen"],
    referencePhotos: [
      {
        content: png,
        contentType: "image/png",
        sourceTitle: "Номер для спокойного отдыха",
        sourceCategory: "Номера",
        sourceTags: ["интерьер", "комфорт"],
      },
      {
        content: secondPng,
        contentType: "image/png",
        sourceTitle: "Тёплая вода и тишина",
        sourceCategory: "SPA",
        sourceTags: ["бассейн", "релакс"],
      },
    ],
  });

  assert.deepEqual(
    requestedPaths,
    Array(5).fill("https://gateway.example/v1/images/edits"),
  );
  assert.deepEqual(
    imageRequests.map(({ size }) => size),
    ["1024x1024", "1024x1536", "1024x1536", "1536x1024", "1536x1024"],
  );
  assert.deepEqual(
    imageRequests.map(({ imageCount }) => imageCount),
    ["2", "1", "1", "1", "1"],
  );
  assert.deepEqual(
    imageRequests.map(({ mask }) => mask !== null),
    [false, true, true, false, false],
  );
  for (const request of imageRequests) {
    assert.equal(request.model, "gpt-image-2");
    assert.equal(request.quality, "medium");
  }
  const squareRequest = imageRequests[0]!;
  assert.equal(squareRequest.images.length, 2);
  assert.match(squareRequest.prompt, /единый основной квадратный кадр 1:1/u);
  assert.match(squareRequest.prompt, /Смысл текста публикации/u);
  assert.match(squareRequest.prompt, /Время для спокойного отдыха/u);
  assert.match(squareRequest.prompt, /Мягкий утренний свет/u);
  assert.match(squareRequest.prompt, /Номер для спокойного отдыха/u);
  assert.match(squareRequest.prompt, /Тёплая вода и тишина/u);
  assert.match(squareRequest.prompt, /не менее 18% высоты кадра/u);
  assert.match(squareRequest.prompt, /Не более двух строк/u);
  for (const request of imageRequests.slice(1, 3)) {
    assert.equal(request.images.length, 1);
    assert.match(request.prompt, /дорисовка \(outpainting\)/u);
    assert.match(request.prompt, /не переписывай и не добавляй текст/u);
  }
  for (const request of imageRequests.slice(3)) {
    assert.equal(request.images.length, 1);
    assert.match(request.prompt, /горизонтальный вариант/u);
    assert.match(request.prompt, /не менее 25% высоты/u);
  }
  assert.deepEqual(storedContentTypes, Array(6).fill("image/png"));
  assert.deepEqual(storedDimensions, [
    { width: 1080, height: 1350 },
    { width: 1200, height: 1200 },
    { width: 1600, height: 900 },
    { width: 1080, height: 1350 },
    { width: 1200, height: 1200 },
    { width: 1600, height: 900 },
  ]);
  assert.equal(createdMedia.length, 6);
  assert.ok(createdMedia.every((media) => media.createdById === "admin-id"));
  assert.equal(result.assets.length, 6);
  assert.deepEqual(
    [...new Set(result.assets.map(({ setIndex }) => setIndex))],
    [0, 1],
  );
  const portrait = result.assets.find(({ channels }) =>
    channels.includes("instagram"),
  );
  const square = result.assets.find(({ channels }) =>
    channels.includes("telegram"),
  );
  const landscape = result.assets.find(({ channels }) =>
    channels.includes("zen"),
  );
  assert.deepEqual(portrait?.channels, ["instagram", "vk"]);
  assert.deepEqual(square?.channels, ["telegram", "max"]);
  assert.deepEqual(landscape?.channels, ["zen"]);
});

test("generates new images from text without requiring source photos", async () => {
  const generatedPng = createSolidImage(320, 320, "#315b46");
  let requestPath = "";
  let requestBody: Record<string, unknown> = {};
  const service = createContentFactoryAiService({
    apiKey: "gateway-test-key",
    baseUrl: "https://gateway.example/v1",
    database: {
      client: {
        contentFactoryMedia: {
          create: async ({ data }: { data: Record<string, unknown> }) => ({
            ...data,
            createdAt: new Date(),
            id: "generated-from-text",
          }),
        },
      },
    } as unknown as Database,
    fetchImplementation: async (url, init) => {
      requestPath = String(url);
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return Response.json({
        data: [{ b64_json: generatedPng.toString("base64") }],
      });
    },
    logger,
    managedStorage: emptyStorage,
  });

  const result = await service.generateImage({
    adminId: "admin-id",
    imageCount: 1,
    mode: "generate",
    postText: "Спокойный день в SPA",
    prompt: "Тёплый свет",
    referencePhotos: [],
    selectedChannels: ["telegram"],
  });

  assert.equal(requestPath, "https://gateway.example/v1/images/generations");
  assert.equal(requestBody.model, "gpt-image-2");
  assert.equal(requestBody.size, "1024x1024");
  assert.equal(requestBody.n, 1);
  assert.match(String(requestBody.prompt), /Исходные фото не приложены/u);
  assert.equal(result.assets.length, 1);
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
  assert.equal(result.adaptations.blog, "Версия для Дзена");
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
      imageCount: 1,
      mode: "edit",
      postText: "Текст публикации",
      prompt: "Оставить как есть",
      selectedChannels: ["vk"],
      referencePhotos: [
        {
          content: Buffer.from("not-an-image"),
          contentType: "image/jpeg",
          sourceTitle: "Фото",
          sourceCategory: "SPA",
          sourceTags: [],
        },
      ],
    }),
    (error: unknown) =>
      error instanceof Error &&
      "code" in error &&
      error.code === "CONTENT_FACTORY_REFERENCE_PHOTO_INVALID",
  );
  assert.equal(requestCount, 0);
});
