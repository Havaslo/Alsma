import { createCanvas } from "@napi-rs/canvas";
import assert from "node:assert/strict";
import { test } from "node:test";
import type { Logger } from "pino";

import type { Database } from "../../lib/database/database.js";
import type { ManagedStorage } from "../../lib/storage/managed-storage.js";
import { createContentFactoryImageGenerationJobsService } from "./content-factory-image-generation-jobs.service.js";

const logger = {
  error() {},
  warn() {},
} as unknown as Logger;

const waitFor = async (predicate: () => boolean) => {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  assert.fail("The image generation job did not reach the expected state.");
};

test("returns immediately and makes generated channel crops available by polling", async () => {
  const referencePhoto = createCanvas(320, 240).toBuffer("image/jpeg");
  const secondReferencePhoto = createCanvas(200, 180).toBuffer("image/jpeg");
  const jobId = "d80e1270-ef90-4d04-bf7c-e716ed0a3c11";
  const adminId = "a011f0bb-d7c5-4221-894a-6c5127fa5a31";
  const generatedMedia = [
    {
      contentType: "image/png",
      createdAt: new Date(),
      createdById: adminId,
      fileName: "AI · 4:5.png",
      id: "4c51645e-ecc5-4e60-93f0-917b641bd2f3",
      objectId: "portrait-object",
      sizeBytes: 100,
    },
    {
      contentType: "image/png",
      createdAt: new Date(),
      createdById: adminId,
      fileName: "AI · 1:1.png",
      id: "4ad3ce48-2812-4613-a7ad-3a32876bcd54",
      objectId: "square-object",
      sizeBytes: 100,
    },
  ];
  let job: Record<string, unknown> | null = null;
  let imageGenerationStarted = false;
  let receivedReferenceCount = 0;
  let finishGeneration: (() => void) | undefined;
  let removedObjects: string[] = [];
  let temporaryObjectCount = 0;
  const generationGate = new Promise<void>((resolve) => {
    finishGeneration = resolve;
  });
  const database = {
    client: {
      contentFactoryImageGenerationJob: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          job = {
            ...data,
            createdAt: new Date(),
            id: jobId,
            status: "pending",
            updatedAt: new Date(),
          };
          return job;
        },
        findFirst: async () => job,
        findUnique: async () => job,
        update: async ({ data }: { data: Record<string, unknown> }) => {
          job = { ...job, ...data, updatedAt: new Date() };
          return job;
        },
        updateMany: async () => {
          if (!job || job.status !== "pending") return { count: 0 };
          job = { ...job, status: "processing", updatedAt: new Date() };
          return { count: 1 };
        },
      },
      contentFactoryMedia: {
        findMany: async ({ where }: { where: { id: { in: string[] } } }) =>
          generatedMedia.filter((media) => where.id.in.includes(media.id)),
      },
    },
  } as unknown as Database;
  const managedStorage = {
    deleteObject: async (objectId: string) => {
      removedObjects.push(objectId);
    },
    getDownload: async (objectId: string) => ({
      contentType: "image/jpeg",
      downloadUrl: `https://storage.example/${objectId}.jpg`,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      sizeBytes: referencePhoto.length,
    }),
    upload: async () => ({
      objectId: `temporary-reference-object-${++temporaryObjectCount}`,
    }),
  } as unknown as ManagedStorage;
  const jobs = createContentFactoryImageGenerationJobsService({
    ai: {
      generateImage: async (input: { referencePhotos: unknown[] }) => {
        imageGenerationStarted = true;
        receivedReferenceCount = input.referencePhotos.length;
        await generationGate;
        return {
          assets: [
            {
              channels: ["vk", "instagram"],
              media: generatedMedia[0]!,
              setIndex: 0,
            },
            { channels: ["telegram"], media: generatedMedia[1]!, setIndex: 0 },
          ],
          model: "gpt-image-1.5",
        };
      },
    } as never,
    database,
    fetchImplementation: async (url) =>
      new Response(
        Uint8Array.from(
          String(url).includes("temporary-reference-object-2")
            ? secondReferencePhoto
            : referencePhoto,
        ),
        {
          headers: { "content-type": "image/jpeg" },
        },
      ),
    logger,
    managedStorage,
  });

  const submitted = await jobs.submit(adminId, {
    imageCount: 1,
    mode: "edit",
    postText: "Пост о фестивале детского рисунка",
    prompt: "Тёплый свет",
    referencePhotos: [
      {
        imageBase64: referencePhoto.toString("base64"),
        sourceCategory: "Загрузки",
        sourceTags: [],
        sourceTitle: "Исходное фото",
      },
      {
        imageBase64: secondReferencePhoto.toString("base64"),
        sourceCategory: "SPA",
        sourceTags: ["вода"],
        sourceTitle: "Второе исходное фото",
      },
    ],
    selectedChannels: ["vk", "telegram", "instagram"],
  });
  assert.equal(submitted.status, "pending");
  assert.equal(submitted.jobId, jobId);
  await waitFor(() => imageGenerationStarted);
  assert.equal(receivedReferenceCount, 2);

  const inProgress = await jobs.getStatus(jobId, adminId);
  assert.equal(inProgress.status, "processing");

  finishGeneration?.();
  await waitFor(() => job?.status === "completed");
  const completed = await jobs.getStatus(jobId, adminId);
  assert.equal(completed.status, "completed");
  if (completed.status !== "completed") assert.fail("Expected completed job.");
  assert.equal(completed.assets.length, 2);
  assert.deepEqual(completed.assets[0]?.channels, ["vk", "instagram"]);
  assert.equal(completed.assets[0]?.setIndex, 0);
  assert.deepEqual(completed.assets[1]?.channels, ["telegram"]);
  await waitFor(
    () =>
      removedObjects.includes("temporary-reference-object-1") &&
      removedObjects.includes("temporary-reference-object-2"),
  );
});
