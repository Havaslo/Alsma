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
    if (!current || !["needs_review", "approved"].includes(current.status)) {
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
