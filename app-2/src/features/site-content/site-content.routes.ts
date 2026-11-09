import { Router } from "express";

import type { Database } from "../../lib/database/database.js";
import { validateRequest } from "../../lib/http/validate-request.js";
import {
  createRequireAdmin,
  createRequireAdminPermission,
} from "../admin-auth/admin-auth.middleware.js";
import { createAdminAuthRepository } from "../admin-auth/admin-auth.repository.js";
import { createAdminAuthService } from "../admin-auth/admin-auth.service.js";
import {
  createListAdminContentHandler,
  createListPublishedContentHandler,
  createUpsertAdminContentHandler,
} from "./site-content.handlers.js";
import { createSiteContentRepository } from "./site-content.repository.js";
import {
  siteContentParamsSchema,
  siteSectionParamsSchema,
  upsertSiteContentBodySchema,
} from "./site-content.schemas.js";
import { renderVkTestRss } from "./vk-rss.js";

export const createSiteContentRouter = (database: Database): Router => {
  const router = Router();
  const repository = createSiteContentRepository(database);
  const requireAdmin = createRequireAdmin(
    createAdminAuthService(createAdminAuthRepository(database)),
  );
  // Only explicitly created test entries; never export the content plan or blog.
  router.get("/feeds/vk-test.xml", async (_request, response) => {
    const rows = await repository.listPublished("vk-rss-test");
    response.setHeader("Cache-Control", "no-store");
    response.type("application/rss+xml").send(renderVkTestRss(rows));
  });
  router.get(
    "/:section",
    validateRequest({ params: siteSectionParamsSchema }),
    createListPublishedContentHandler(repository),
  );
  router.get(
    "/admin/:section",
    requireAdmin,
    createRequireAdminPermission("site.access", "site.manage"),
    validateRequest({ params: siteSectionParamsSchema }),
    createListAdminContentHandler(repository),
  );
  router.put(
    "/admin/:section/:itemKey",
    requireAdmin,
    createRequireAdminPermission("site.manage"),
    validateRequest({
      body: upsertSiteContentBodySchema,
      params: siteContentParamsSchema,
    }),
    createUpsertAdminContentHandler(repository),
  );
  return router;
};
