import { Router, raw } from "express";

import type { Database } from "../../lib/database/database.js";
import { validateRequest } from "../../lib/http/validate-request.js";
import type { ManagedStorage } from "../../lib/storage/managed-storage.js";
import {
  createRequireAdmin,
  createRequireAdminPermission,
} from "../admin-auth/admin-auth.middleware.js";
import { createAdminAuthRepository } from "../admin-auth/admin-auth.repository.js";
import { createAdminAuthService } from "../admin-auth/admin-auth.service.js";
import {
  contentFactoryUploadLimit,
  createListContentFactoryDraftsHandler,
  createListContentFactoryMediaHandler,
  createSaveContentFactoryDraftHandler,
  createUploadContentFactoryMediaHandler,
} from "./content-factory.handlers.js";
import {
  contentFactoryDraftBodySchema,
  contentFactoryDraftParamsSchema,
  contentFactoryUploadQuerySchema,
} from "./content-factory.schemas.js";

export const createContentFactoryRouter = (
  database: Database,
  managedStorage: ManagedStorage,
): Router => {
  const router = Router();
  router.use(
    createRequireAdmin(
      createAdminAuthService(createAdminAuthRepository(database)),
    ),
    createRequireAdminPermission("site.access", "site.manage"),
  );

  router.get("/drafts", createListContentFactoryDraftsHandler(database));
  router.post(
    "/drafts",
    validateRequest({ body: contentFactoryDraftBodySchema }),
    createSaveContentFactoryDraftHandler(database, false),
  );
  router.put(
    "/drafts/:draftId",
    validateRequest({
      body: contentFactoryDraftBodySchema,
      params: contentFactoryDraftParamsSchema,
    }),
    createSaveContentFactoryDraftHandler(database, true),
  );
  router.get("/media", createListContentFactoryMediaHandler(database));
  router.post(
    "/media",
    raw({ limit: contentFactoryUploadLimit, type: () => true }),
    validateRequest({ query: contentFactoryUploadQuerySchema }),
    createUploadContentFactoryMediaHandler(database, managedStorage),
  );
  return router;
};
