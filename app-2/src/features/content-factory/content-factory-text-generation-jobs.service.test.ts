import assert from "node:assert/strict";
import { test } from "node:test";
import type { Logger } from "pino";

import type { Database } from "../../lib/database/database.js";
import { HttpError } from "../../lib/http/http-error.js";
import { createContentFactoryTextGenerationJobsService } from "./content-factory-text-generation-jobs.service.js";

const logger = {
  error() {},
  warn() {},
} as unknown as Logger;

const generatedResult = {
  model: "gpt-4.1-mini",
  variants: Array.from({ length: 3 }, (_, index) => ({
    title: `Вариант ${index + 1}`,
    concept: "Редакторский вариант",
    text: "Подготовленный текст",
    adaptations: {
      vk: "VK",
      telegram: "Telegram",
      max: "MAX",
      instagram: "Instagram",
      zen: "Статья для Дзена",
      blog: "Статья для блога",
    },
  })),
};

const waitFor = async (predicate: () => boolean) => {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  assert.fail("The text generation job did not reach the expected state.");
};

test("returns immediately and exposes generated text through status polling", async () => {
  const jobId = "d80e1270-ef90-4d04-bf7c-e716ed0a3c11";
  const adminId = "a011f0bb-d7c5-4221-894a-6c5127fa5a31";
  let job: Record<string, unknown> | null = null;
  let generationStarted = false;
  let finishGeneration: (() => void) | undefined;
  const generationGate = new Promise<void>((resolve) => {
    finishGeneration = resolve;
  });
  const database = {
    client: {
      contentFactoryTextGenerationJob: {
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
        findFirst: async ({ where }: { where: { createdById: string } }) =>
          where.createdById === adminId ? job : null,
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
    },
  } as unknown as Database;
  const jobs = createContentFactoryTextGenerationJobsService({
    ai: {
      generateText: async () => {
        generationStarted = true;
        await generationGate;
        return generatedResult;
      },
    } as never,
    database,
    logger,
  });

  const submitted = await jobs.submit(adminId, {
    prompt: "Тестовый пост",
    selectedChannels: ["blog"],
  });
  assert.deepEqual(submitted, { jobId, status: "pending" });
  await waitFor(() => generationStarted);
  assert.deepEqual(await jobs.getStatus(jobId, adminId), {
    status: "processing",
  });

  finishGeneration?.();
  await waitFor(() => job?.status === "completed");
  assert.deepEqual(await jobs.getStatus(jobId, adminId), {
    result: generatedResult,
    status: "completed",
  });
});

test("text generation job results are restricted to their creating administrator", async () => {
  const database = {
    client: {
      contentFactoryTextGenerationJob: {
        findFirst: async () => null,
      },
    },
  } as unknown as Database;
  const jobs = createContentFactoryTextGenerationJobsService({
    ai: { generateText: async () => generatedResult } as never,
    database,
    logger,
  });

  await assert.rejects(
    jobs.getStatus("d80e1270-ef90-4d04-bf7c-e716ed0a3c11", "other-admin"),
    (error: unknown) =>
      error instanceof HttpError &&
      error.status === 404 &&
      error.code === "CONTENT_FACTORY_TEXT_JOB_NOT_FOUND",
  );
});
