import type { Database } from "../../lib/database/database.js";
import type {
  ContentPlanPostInput,
  ContentPlanPostUpdate,
  ManualContentPlanPost,
} from "./content-plan.schemas.js";

export const createContentPlanRepository = (database: Database) => ({
  createImport: async (
    adminId: string,
    fileName: string,
    posts: readonly ContentPlanPostInput[],
  ) =>
    database.client.contentPlanImport.create({
      data: {
        createdById: adminId,
        fileName,
        posts: {
          create: posts.map((post) => ({
            sourceRow: post.sourceRow,
            scheduledDate: new Date(`${post.date}T00:00:00.000Z`),
            scheduledTime: post.time,
            postType: post.postType,
            channel: post.channel,
            format: post.format,
            topic: post.topic,
            audience: post.audience,
            keyFacts: post.keyFacts,
            callToAction: post.callToAction,
            styleGuidance: post.styleGuidance,
            imagePrompt: post.imagePrompt,
            sourceImageRecommendation: post.sourceImageRecommendation,
            createdById: adminId,
          })),
        },
      },
      include: { posts: { select: { id: true } } },
    }),
  createManualPosts: (adminId: string, input: ManualContentPlanPost) =>
    database.client.contentPlanImport.create({
      data: {
        createdById: adminId,
        fileName: "Создано в редакторе контента",
        posts: {
          create: input.posts.map((post, index) => ({
            sourceRow: index + 1,
            scheduledDate: new Date(`${input.date}T00:00:00.000Z`),
            scheduledTime: input.time,
            postType: "Пост",
            channel: post.channel,
            format: "Пост",
            topic: input.title,
            generatedTitle: input.title,
            generatedCopy: post.text,
            imageIds: post.imageIds,
            status: "needs_review",
            createdById: adminId,
          })),
        },
      },
      include: { posts: { select: { id: true } } },
    }),
  listPosts: () =>
    database.client.contentPlanPost.findMany({
      include: { import: { select: { fileName: true } } },
      orderBy: [
        { scheduledDate: "asc" },
        { scheduledTime: "asc" },
        { createdAt: "desc" },
      ],
      take: 1_000,
    }),
  listQueuedPostIds: () =>
    database.client.contentPlanPost.findMany({
      select: { id: true },
      where: { status: "queued" },
      orderBy: { createdAt: "asc" },
    }),
  requeueStalePosts: (cutoff: Date) =>
    database.client.contentPlanPost.updateMany({
      data: { generationError: null, status: "queued" },
      where: { status: "generating", updatedAt: { lt: cutoff } },
    }),
  claimPost: (postId: string) =>
    database.client.contentPlanPost.updateMany({
      data: { generationError: null, status: "generating" },
      where: { id: postId, status: "queued" },
    }),
  findPostForGeneration: (postId: string) =>
    database.client.contentPlanPost.findUnique({ where: { id: postId } }),
  completeGeneration: (
    postId: string,
    input: { readonly title: string; readonly copy: string },
  ) =>
    database.client.contentPlanPost.updateMany({
      data: {
        generatedTitle: input.title,
        generatedCopy: input.copy,
        generationError: null,
        status: "needs_review",
      },
      where: { id: postId, status: "generating" },
    }),
  failGeneration: (postId: string, message: string) =>
    database.client.contentPlanPost.updateMany({
      data: {
        generationError: message.slice(0, 1_000),
        status: "generation_failed",
      },
      where: { id: postId, status: "generating" },
    }),
  retryPost: (postId: string) =>
    database.client.contentPlanPost.updateMany({
      data: { generationError: null, status: "queued" },
      where: { id: postId, status: "generation_failed" },
    }),
  updateReviewPost: async (postId: string, input: ContentPlanPostUpdate) => {
    const current = await database.client.contentPlanPost.findUnique({
      select: { id: true, status: true },
      where: { id: postId },
    });
    if (
      !current ||
      !["needs_review", "approved", "publish_failed"].includes(current.status)
    ) {
      return null;
    }
    const updated = await database.client.contentPlanPost.updateMany({
      data: {
        ...(input.date
          ? { scheduledDate: new Date(`${input.date}T00:00:00.000Z`) }
          : {}),
        ...(input.time ? { scheduledTime: input.time } : {}),
        ...(input.title ? { generatedTitle: input.title } : {}),
        ...(input.text ? { generatedCopy: input.text } : {}),
        publicationAttemptedAt: null,
        publicationError: null,
        status: "needs_review",
        approvedAt: null,
        approvedById: null,
      },
      where: { id: postId, status: current.status },
    });
    if (updated.count === 0) return null;
    return database.client.contentPlanPost.findUnique({
      include: { import: { select: { fileName: true } } },
      where: { id: postId },
    });
  },
  approvePost: async (postId: string, adminId: string) => {
    const updated = await database.client.contentPlanPost.updateMany({
      data: {
        approvedAt: new Date(),
        approvedById: adminId,
        status: "approved",
      },
      where: { id: postId, status: "needs_review" },
    });
    if (updated.count === 0) return null;
    return database.client.contentPlanPost.findUnique({
      include: { import: { select: { fileName: true } } },
      where: { id: postId },
    });
  },
  schedulePost: async (postId: string) => {
    const updated = await database.client.contentPlanPost.updateMany({
      data: {
        publicationAttemptedAt: null,
        publicationError: null,
        status: "scheduled",
      },
      where: { id: postId, status: { in: ["approved", "publish_failed"] } },
    });
    if (updated.count === 0) return null;
    return database.client.contentPlanPost.findUnique({
      include: { import: { select: { fileName: true } } },
      where: { id: postId },
    });
  },
  listDuePostIds: (scheduledDate: Date, scheduledTime: string) =>
    database.client.contentPlanPost.findMany({
      select: { id: true },
      where: {
        status: "scheduled",
        OR: [
          { scheduledDate: { lt: scheduledDate } },
          { scheduledDate, scheduledTime: { lte: scheduledTime } },
        ],
      },
      orderBy: [{ scheduledDate: "asc" }, { scheduledTime: "asc" }],
      take: 25,
    }),
  claimScheduledPost: (postId: string) =>
    database.client.contentPlanPost.updateMany({
      data: {
        publicationAttemptedAt: new Date(),
        publicationError: null,
        status: "publishing",
      },
      where: { id: postId, status: "scheduled" },
    }),
  findPostForPublishing: (postId: string) =>
    database.client.contentPlanPost.findUnique({ where: { id: postId } }),
  completePublishing: (
    postId: string,
    result: {
      readonly externalId: string | null;
      readonly url: string | null;
      readonly publishedAt: Date;
    },
  ) =>
    database.client.contentPlanPost.updateMany({
      data: {
        publicationError: null,
        publishedAt: result.publishedAt,
        publishedExternalId: result.externalId,
        publishedUrl: result.url,
        status: "published",
      },
      where: { id: postId, status: "publishing" },
    }),
  failPublishing: (
    postId: string,
    result: { readonly error: string; readonly uncertain: boolean },
  ) =>
    database.client.contentPlanPost.updateMany({
      data: {
        publicationError: result.error.slice(0, 1_000),
        status: result.uncertain ? "publish_unknown" : "publish_failed",
      },
      where: { id: postId, status: "publishing" },
    }),
  markStalePublishingAsUnknown: (cutoff: Date) =>
    database.client.contentPlanPost.updateMany({
      data: {
        publicationError:
          "Не удалось подтвердить результат отправки. Проверьте соцсеть перед повтором.",
        status: "publish_unknown",
      },
      where: {
        publicationAttemptedAt: { lt: cutoff },
        status: "publishing",
      },
    }),
  cancelPost: async (postId: string) => {
    const updated = await database.client.contentPlanPost.updateMany({
      data: { status: "cancelled" },
      where: {
        id: postId,
        status: {
          in: [
            "queued",
            "generating",
            "generation_failed",
            "needs_review",
            "approved",
            "scheduled",
          ],
        },
      },
    });
    if (updated.count === 0) return null;
    return database.client.contentPlanPost.findUnique({
      include: { import: { select: { fileName: true } } },
      where: { id: postId },
    });
  },
});

export type ContentPlanRepository = ReturnType<
  typeof createContentPlanRepository
>;
