import { z } from "zod";

export const siteSectionParamsSchema = z.object({
  section: z.string().regex(/^[a-z0-9-]{2,80}$/),
});
export const siteContentParamsSchema = siteSectionParamsSchema.extend({
  itemKey: z.string().regex(/^[a-z0-9-]{2,80}$/),
});
export const upsertSiteContentBodySchema = z.object({
  content: z.record(z.string(), z.unknown()),
  position: z.number().int().min(0).max(10_000).default(0),
  status: z.enum(["draft", "published", "archived"]).default("published"),
  title: z.string().trim().max(240).nullable().optional(),
});
export type SiteSectionParams = z.infer<typeof siteSectionParamsSchema>;
export type SiteContentParams = z.infer<typeof siteContentParamsSchema>;
export type UpsertSiteContentBody = z.infer<typeof upsertSiteContentBodySchema>;
