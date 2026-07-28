import type { Prisma } from "../../generated/prisma/client.js";
import type { Database } from "../../lib/database/database.js";
import type { UpsertSiteContentBody } from "./site-content.schemas.js";

export const createSiteContentRepository = (database: Database) => ({
  listPublished: (section: string) =>
    database.client.siteContent.findMany({
      orderBy: { position: "asc" },
      where: { section, status: "published" },
    }),
  listSection: (section: string) =>
    database.client.siteContent.findMany({
      orderBy: { position: "asc" },
      where: { section },
    }),
  upsert: (section: string, itemKey: string, input: UpsertSiteContentBody) =>
    database.client.siteContent.upsert({
      create: {
        ...input,
        content: input.content as Prisma.InputJsonValue,
        itemKey,
        section,
      },
      update: { ...input, content: input.content as Prisma.InputJsonValue },
      where: { section_itemKey: { itemKey, section } },
    }),
});

export type SiteContentRepository = ReturnType<
  typeof createSiteContentRepository
>;
