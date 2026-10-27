import { createCanvas, loadImage } from "@napi-rs/canvas";
import assert from "node:assert/strict";
import { test } from "node:test";
import type { Logger } from "pino";

import type { Database } from "../../lib/database/database.js";
import type { ManagedStorage } from "../../lib/storage/managed-storage.js";
import { createContentFactoryImageGenerationService } from "./content-factory-image-generation.service.js";

type ImageRequest = {
  readonly images: readonly {
    readonly content: Buffer;
    readonly contentType: string;
    readonly fileName: string;
  }[];
  readonly imageCount: number;
  readonly mask?: Buffer;
  readonly prompt: string;
  readonly size: string;
};

const createImage = (width: number, height: number, color: string) => {
  const canvas = createCanvas(width, height);
  const context = canvas.getContext("2d");
  context.fillStyle = color;
  context.fillRect(0, 0, width, height);
  return canvas.toBuffer("image/png");
};

test("uses one square master for square, portrait outpainting, and landscape", async () => {
  const square = createImage(1024, 1024, "#173f2d");
  const portraitEdit = createImage(1024, 1536, "#b33a26");
  const landscapeEdit = createImage(1536, 1024, "#3a72b3");
  const calls: ImageRequest[] = [];
  const uploadedImages: Buffer[] = [];
  let mediaId = 0;
  let objectId = 0;
  const service = createContentFactoryImageGenerationService({
    database: {
      client: {
        contentFactoryMedia: {
          create: async ({ data }: { data: Record<string, unknown> }) => ({
            ...data,
            createdAt: new Date(),
            id: `media-${++mediaId}`,
          }),
          delete: async () => undefined,
        },
      },
    } as unknown as Database,
    logger: { error() {}, warn() {} } as unknown as Logger,
    managedStorage: {
      deleteObject: async () => undefined,
      upload: async ({ content }: { content: Uint8Array }) => {
        uploadedImages.push(Buffer.from(content));
        return { objectId: `image-${++objectId}` };
      },
    } as unknown as ManagedStorage,
    requestImage: async (request) => {
      calls.push(request);
      const image =
        calls.length === 1
          ? square
          : request.mask
            ? portraitEdit
            : landscapeEdit;
      return { data: [{ b64_json: image.toString("base64") }] };
    },
  });

  const generated = await service.generateImage({
    adminId: "admin-1",
    imageCount: 1,
    mode: "generate",
    postText: "Фестиваль итальянской кухни",
    prompt: "Тёплый вечерний свет",
    referencePhotos: [],
    selectedChannels: ["vk", "telegram", "zen", "blog"],
  });

  assert.equal(calls.length, 3);
  assert.deepEqual(
    calls.map(({ size, mask }) => ({ hasMask: Boolean(mask), size })),
    [
      { hasMask: false, size: "1024x1024" },
      { hasMask: true, size: "1024x1536" },
      { hasMask: false, size: "1536x1024" },
    ],
  );
  assert.deepEqual(calls[2]?.images[0]?.content, square);
  assert.match(calls[1]?.prompt ?? "", /дорисовка/i);
  assert.match(calls[2]?.prompt ?? "", /переданный квадрат как главный/i);
  assert.equal(generated.assets.length, 3);
  assert.deepEqual(generated.assets[2]?.channels, ["zen", "blog"]);

  const outputDimensions = await Promise.all(
    uploadedImages.map(async (content) => {
      const image = await loadImage(content);
      return [image.width, image.height];
    }),
  );
  assert.deepEqual(outputDimensions, [
    [1080, 1350],
    [1200, 1200],
    [1600, 900],
  ]);
});
