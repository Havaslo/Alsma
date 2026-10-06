import { Router, raw } from "express";
import type { Logger } from "pino";

import type { Database } from "../../lib/database/database.js";
import { validateRequest } from "../../lib/http/validate-request.js";
import type { ManagedStorage } from "../../lib/storage/managed-storage.js";
import {
  createRequireAdmin,
  createRequireAdminPermission,
} from "../admin-auth/admin-auth.middleware.js";
import { createAdminAuthRepository } from "../admin-auth/admin-auth.repository.js";
import { createAdminAuthService } from "../admin-auth/admin-auth.service.js";
import { createContentFactoryAiService } from "./content-factory-ai.service.js";
import { contentFactoryGuidelinesResponse } from "./content-factory-guidelines.js";
import { createContentFactoryImageGenerationJobsService } from "./content-factory-image-generation-jobs.service.js";
import {
  contentFactoryUploadLimit,
  createGenerateContentFactoryTextHandler,
  createGetContentFactoryImageGenerationJobHandler,
  createListContentFactoryDraftsHandler,
  createListContentFactoryMediaHandler,
  createRefineContentFactoryTextHandler,
  createSaveContentFactoryDraftHandler,
  createSubmitContentFactoryImageGenerationJobHandler,
  createUploadContentFactoryMediaHandler,
} from "./content-factory.handlers.js";
import {
  contentFactoryDraftBodySchema,
  contentFactoryDraftParamsSchema,
  contentFactoryImageGenerationBodySchema,
  contentFactoryImageGenerationJobParamsSchema,
  contentFactoryTextGenerationQuerySchema,
  contentFactoryTextRefinementBodySchema,
  contentFactoryUploadQuerySchema,
} from "./content-factory.schemas.js";

export const createContentFactoryRouter = (
  database: Database,
  managedStorage: ManagedStorage,
  aiGateway: { readonly apiKey?: string; readonly baseUrl?: string },
  logger: Logger,
): Router => {
  const router = Router();
  const ai = createContentFactoryAiService({
    ...aiGateway,
    database,
    logger,
    managedStorage,
  });
  const imageGenerationJobs = createContentFactoryImageGenerationJobsService({
    ai,
    database,
    logger,
    managedStorage,
  });
  router.use(
    createRequireAdmin(
      createAdminAuthService(createAdminAuthRepository(database)),
    ),
    createRequireAdminPermission("site.access", "site.manage"),
  );

  router.get("/guidelines", (_request, response) => {
    response.json(contentFactoryGuidelinesResponse);
  });
  router.get("/drafts", createListContentFactoryDraftsHandler(database));
  router.post(
    "/generate/text",
    raw({ limit: contentFactoryUploadLimit, type: () => true }),
    validateRequest({ query: contentFactoryTextGenerationQuerySchema }),
    createGenerateContentFactoryTextHandler(ai),
  );
  router.post(
    "/generate/refine",
    validateRequest({ body: contentFactoryTextRefinementBodySchema }),
    createRefineContentFactoryTextHandler(ai),
  );
  router.post(
    "/generate/image",
    validateRequest({ body: contentFactoryImageGenerationBodySchema }),
    createSubmitContentFactoryImageGenerationJobHandler(imageGenerationJobs),
  );
  router.get(
    "/generate/image/:jobId",
    validateRequest({ params: contentFactoryImageGenerationJobParamsSchema }),
    createGetContentFactoryImageGenerationJobHandler(imageGenerationJobs),
  );
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
