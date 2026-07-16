import { Router } from "express";

import type { Database } from "../../lib/database/database.js";
import { validateRequest } from "../../lib/http/validate-request.js";
import { createRequireAdmin } from "../admin-auth/admin-auth.middleware.js";
import { createAdminAuthRepository } from "../admin-auth/admin-auth.repository.js";
import { createAdminAuthService } from "../admin-auth/admin-auth.service.js";
import {
  createAnswerKnowledgeHandler,
  createGetKnowledgeBaseHandler,
  createPublishKnowledgeArticleHandler,
  createSaveKnowledgeArticleHandler,
  createSaveKnowledgeRuleHandler,
} from "./knowledge-base.handlers.js";
import { createKnowledgeBaseRepository } from "./knowledge-base.repository.js";
import {
  knowledgeAnswerBodySchema,
  knowledgeArticleBodySchema,
  knowledgeArticleParamsSchema,
  knowledgeRuleBodySchema,
} from "./knowledge-base.schemas.js";
import { createKnowledgeBaseService } from "./knowledge-base.service.js";

export const createKnowledgeBaseRouter = (database: Database): Router => {
  const router = Router();
  const requireAdmin = createRequireAdmin(
    createAdminAuthService(createAdminAuthRepository(database)),
  );
  const service = createKnowledgeBaseService(
    createKnowledgeBaseRepository(database),
  );

  router.use(requireAdmin);
  router.get("/", createGetKnowledgeBaseHandler(service));
  router.post(
    "/articles",
    validateRequest({ body: knowledgeArticleBodySchema }),
    createSaveKnowledgeArticleHandler(service),
  );
  router.post(
    "/articles/:articleId/publish",
    validateRequest({ params: knowledgeArticleParamsSchema }),
    createPublishKnowledgeArticleHandler(service),
  );
  router.post(
    "/rules",
    validateRequest({ body: knowledgeRuleBodySchema }),
    createSaveKnowledgeRuleHandler(service),
  );
  router.post(
    "/answer",
    validateRequest({ body: knowledgeAnswerBodySchema }),
    createAnswerKnowledgeHandler(service),
  );
  return router;
};
