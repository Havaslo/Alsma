import assert from "node:assert/strict";
import test from "node:test";
import pino from "pino";

import type { Database } from "../../lib/database/database.js";
import { createContentPlanGenerationService } from "./content-plan-generation.service.js";
import type { ContentPlanImportBody } from "./content-plan.schemas.js";

const waitFor = async (predicate: () => boolean) => {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  assert.fail("Content plan generation did not finish in time");
};

const runImport = async (
  imageSourceMode: ContentPlanImportBody["posts"][number]["imageSourceMode"],
) => {
  const post = {
    id: "post-1",
    importId: "import-1",
    sourceRow: 2,
    scheduledDate: new Date("2026-10-19T00:00:00.000Z"),
    scheduledTime: "12:00",
    postType: "Пост",
    channel: "vk",
    format: "Пост",
    topic: "Осенний отдых",
    audience: "Гости отеля",
    keyFacts: "Подтверждённые факты",
    callToAction: "Уточнить детали",
    styleGuidance: "Спокойный тон",
    imagePrompt: "Осенний пейзаж",
    imageSourceMode,
    sourceImageRecommendation:
      imageSourceMode === "generate" ? "" : "terrace.jpg",
    createdById: "admin-1",
    generatedTitle: "",
    generatedCopy: "",
    imageIds: [] as string[],
    imageStatus: "pending",
    imageError: null as string | null,
    status: "queued",
    generationError: null as string | null,
  };
  const libraryMedia = {
    id: "library-image",
    fileName: "terrace.jpg",
    objectId: "media-object-1",
    contentType: "image/jpeg",
  };
  let imageGenerationCalls = 0;
  let requestedImageMode = "";

  const database = {
    client: {
      contentPlanImport: {
        create: async () => ({ id: "import-1", posts: [{ id: post.id }] }),
      },
      contentPlanPost: {
        updateMany: async (input: {
          where: { id: string; status: string };
          data: Record<string, unknown>;
        }) => {
          if (
            input.where.id !== post.id ||
            input.where.status !== post.status
          ) {
            return { count: 0 };
          }
          Object.assign(post, input.data);
          return { count: 1 };
        },
        findUnique: async () => post,
      },
      contentFactoryMedia: {
        findMany: async () =>
          imageSourceMode === "library" ? [libraryMedia] : [],
      },
    },
  } as unknown as Database;
  const service = createContentPlanGenerationService({
    ai: {
      generatePlanCopy: async () => ({
        title: "Осень в Alsma",
        text: "Проведите выходные на природе.",
      }),
      generateImage: async (input: { readonly mode: string }) => {
        imageGenerationCalls += 1;
        requestedImageMode = input.mode;
        return {
          assets: [{ channels: ["vk"], media: { id: "generated-image" } }],
        } as never;
      },
    } as never,
    database,
    logger: pino({ level: "silent" }),
    managedStorage: {} as never,
  });

  await service.submit("admin-1", {
    fileName: "plan.xlsx",
    posts: [
      {
        sourceRow: 2,
        date: "2026-10-19",
        time: "12:00",
        postType: "Пост",
        channel: "vk",
        format: "Пост",
        topic: "Осенний отдых",
        audience: "Гости отеля",
        keyFacts: "Подтверждённые факты",
        callToAction: "Уточнить детали",
        styleGuidance: "Спокойный тон",
        imagePrompt: "Осенний пейзаж",
        imageSourceMode,
        sourceImageRecommendation:
          imageSourceMode === "generate" ? "" : "terrace.jpg",
      },
    ],
  });
  await waitFor(() => post.status === "needs_review");

  return { imageGenerationCalls, post, requestedImageMode };
};

test("content-plan import generates and saves an image for each from-scratch post", async () => {
  const result = await runImport("generate");

  assert.equal(result.imageGenerationCalls, 1);
  assert.equal(result.requestedImageMode, "generate");
  assert.deepEqual(result.post.imageIds, ["generated-image"]);
  assert.equal(result.post.imageStatus, "completed");
});

test("content-plan import attaches a library image without generating another", async () => {
  const result = await runImport("library");

  assert.equal(result.imageGenerationCalls, 0);
  assert.deepEqual(result.post.imageIds, ["library-image"]);
  assert.equal(result.post.imageStatus, "completed");
});
