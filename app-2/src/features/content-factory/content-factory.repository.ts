import type { Prisma } from "../../generated/prisma/client.js";
import type { Database } from "../../lib/database/database.js";
import type { ContentFactoryDraftBody } from "./content-factory.schemas.js";

export const createContentFactoryRepository = (database: Database) => ({
  listDrafts: () =>
    database.client.contentFactoryDraft.findMany({
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    }),
  createDraft: (adminId: string, input: ContentFactoryDraftBody) =>
    database.client.contentFactoryDraft.create({
      data: {
        createdById: adminId,
        snapshot: input.snapshot as Prisma.InputJsonValue,
        title: input.title,
      },
    }),
  updateDraft: async (draftId: string, input: ContentFactoryDraftBody) => {
    const existing = await database.client.contentFactoryDraft.findUnique({
      where: { id: draftId },
      select: { id: true },
    });
    if (!existing) return null;
    return database.client.contentFactoryDraft.update({
      data: {
        snapshot: input.snapshot as Prisma.InputJsonValue,
        title: input.title,
      },
      where: { id: draftId },
    });
  },
  listMedia: () =>
    database.client.contentFactoryMedia.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    }),
  createMedia: (input: {
    adminId: string;
    contentType: string;
    fileName: string;
    objectId: string;
    sizeBytes: number;
  }) =>
    database.client.contentFactoryMedia.create({
      data: {
        contentType: input.contentType,
        createdById: input.adminId,
        fileName: input.fileName,
        objectId: input.objectId,
        sizeBytes: input.sizeBytes,
      },
    }),
  findMediaByIds: (mediaIds: readonly string[]) =>
    database.client.contentFactoryMedia.findMany({
      where: { id: { in: [...mediaIds] } },
    }),
  deleteMedia: (mediaId: string) =>
    database.client.contentFactoryMedia.delete({ where: { id: mediaId } }),
  createImageGenerationJob: (input: {
    readonly createdById: string;
    readonly imageCount: number;
    readonly mode: string;
    readonly postText: string;
    readonly prompt: string;
    readonly referencePhotoObjectId: string;
    readonly referencePhotos: Prisma.InputJsonValue;
    readonly selectedChannels: readonly string[];
    readonly sourceCategory: string;
    readonly sourceTags: readonly string[];
    readonly sourceTitle: string;
  }) =>
    database.client.contentFactoryImageGenerationJob.create({
      data: {
        createdById: input.createdById,
        imageCount: input.imageCount,
        mode: input.mode,
        postText: input.postText,
        prompt: input.prompt,
        referencePhotoObjectId: input.referencePhotoObjectId,
        referencePhotos: input.referencePhotos,
        selectedChannels: [...input.selectedChannels],
        sourceCategory: input.sourceCategory,
        sourceTags: [...input.sourceTags],
        sourceTitle: input.sourceTitle,
      },
    }),
  findImageGenerationJob: (jobId: string) =>
    database.client.contentFactoryImageGenerationJob.findUnique({
      where: { id: jobId },
    }),
  findImageGenerationJobForAdmin: (jobId: string, adminId: string) =>
    database.client.contentFactoryImageGenerationJob.findFirst({
      where: { createdById: adminId, id: jobId },
    }),
  claimImageGenerationJob: (jobId: string) =>
    database.client.contentFactoryImageGenerationJob.updateMany({
      data: { status: "processing" },
      where: { id: jobId, status: "pending" },
    }),
  updateImageGenerationJob: (
    jobId: string,
    input: {
      readonly errorMessage?: string | null;
      readonly referencePhotoObjectId?: string;
      readonly referencePhotos?: Prisma.InputJsonValue;
      readonly result?: Prisma.InputJsonValue;
      readonly status: string;
    },
  ) =>
    database.client.contentFactoryImageGenerationJob.update({
      data: input,
      where: { id: jobId },
    }),
  listPendingImageGenerationJobs: () =>
    database.client.contentFactoryImageGenerationJob.findMany({
      select: { id: true },
      where: { status: "pending" },
    }),
});

export type ContentFactoryRepository = ReturnType<
  typeof createContentFactoryRepository
>;
