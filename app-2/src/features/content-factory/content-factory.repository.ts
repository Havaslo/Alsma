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
  deleteMedia: (mediaId: string) =>
    database.client.contentFactoryMedia.delete({ where: { id: mediaId } }),
});

export type ContentFactoryRepository = ReturnType<
  typeof createContentFactoryRepository
>;
