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
  createGenerateContentFactoryTaskHandler,
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
  contentFactoryTextGenerationBodySchema,
  contentFactoryTextGenerationQuerySchema,
  contentFactoryTextRefinementBodySchema,
  contentFactoryUploadQuerySchema,
} from "./content-factory.schemas.js";
import { createContentPlanGenerationService } from "./content-plan-generation.service.js";
import {
  contentPlanUploadLimit,
  createApproveContentPlanPostHandler,
  createCancelContentPlanPostHandler,
  createCreateManualContentPlanPostsHandler,
  createGenerateContentPlanHandler,
  createListContentPlanPostsHandler,
  createPreviewContentPlanHandler,
  createRetryContentPlanPostHandler,
  createUpdateContentPlanPostHandler,
} from "./content-plan.handlers.js";
import {
  contentPlanFileQuerySchema,
  contentPlanImportBodySchema,
  contentPlanPostParamsSchema,
  contentPlanPostUpdateSchema,
  manualContentPlanPostSchema,
} from "./content-plan.schemas.js";

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
  const contentPlanGeneration = createContentPlanGenerationService({
    ai,
    database,
    logger,
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
  router.post(
    "/plan/preview",
    raw({ limit: contentPlanUploadLimit, type: () => true }),
    validateRequest({ query: contentPlanFileQuerySchema }),
    createPreviewContentPlanHandler,
  );
  router.post(
    "/plan/generate",
    validateRequest({ body: contentPlanImportBodySchema }),
    createGenerateContentPlanHandler(contentPlanGeneration),
  );
  router.post(
    "/plan/posts/manual",
    validateRequest({ body: manualContentPlanPostSchema }),
    createCreateManualContentPlanPostsHandler(contentPlanGeneration),
  );
  router.get(
    "/plan/posts",
    createListContentPlanPostsHandler(database, contentPlanGeneration),
  );
  router.patch(
    "/plan/posts/:postId",
    validateRequest({
      body: contentPlanPostUpdateSchema,
      params: contentPlanPostParamsSchema,
    }),
    createUpdateContentPlanPostHandler(database),
  );
  router.post(
    "/plan/posts/:postId/approve",
    validateRequest({ params: contentPlanPostParamsSchema }),
    createApproveContentPlanPostHandler(database),
  );
  router.post(
    "/plan/posts/:postId/cancel",
    validateRequest({ params: contentPlanPostParamsSchema }),
    createCancelContentPlanPostHandler(database),
  );
  router.post(
    "/plan/posts/:postId/retry",
    validateRequest({ params: contentPlanPostParamsSchema }),
    createRetryContentPlanPostHandler(contentPlanGeneration),
  );
  router.get("/drafts", createListContentFactoryDraftsHandler(database));
  router.post(
    "/generate/task",
    validateRequest({ body: contentFactoryTextGenerationBodySchema }),
    createGenerateContentFactoryTaskHandler(ai),
  );
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
