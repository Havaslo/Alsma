import type { RequestHandler } from "express";

import type { SiteContentRepository } from "./site-content.repository.js";
import type {
  SiteContentParams,
  SiteSectionParams,
  UpsertSiteContentBody,
} from "./site-content.schemas.js";

export const createListPublishedContentHandler =
  (repository: SiteContentRepository): RequestHandler =>
  async (_request, response) => {
    const { section } = response.locals.input.params as SiteSectionParams;
    response.json({ items: await repository.listPublished(section) });
  };
export const createListAdminContentHandler =
  (repository: SiteContentRepository): RequestHandler =>
  async (_request, response) => {
    const { section } = response.locals.input.params as SiteSectionParams;
    response.json({ items: await repository.listSection(section) });
  };
export const createUpsertAdminContentHandler =
  (repository: SiteContentRepository): RequestHandler =>
  async (_request, response) => {
    const { itemKey, section } = response.locals.input
      .params as SiteContentParams;
    response.json({
      item: await repository.upsert(
        section,
        itemKey,
        response.locals.input.body as UpsertSiteContentBody,
      ),
    });
  };
