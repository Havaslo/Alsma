import { Router } from "express";

import type { Database } from "../../lib/database/database.js";
import { validateRequest } from "../../lib/http/validate-request.js";
import {
  createRequireAdmin,
  createRequireAdminPermission,
} from "../admin-auth/admin-auth.middleware.js";
import { createAdminAuthRepository } from "../admin-auth/admin-auth.repository.js";
import { createAdminAuthService } from "../admin-auth/admin-auth.service.js";
import { createAgentScenariosRepository } from "./agent-scenarios.repository.js";
import {
  agentScenarioBodySchema,
  agentTransferRuleBodySchema,
} from "./agent-scenarios.schemas.js";

export const createAgentScenariosRouter = (database: Database): Router => {
  const router = Router();
  const repository = createAgentScenariosRepository(database);
  const requireAdmin = createRequireAdmin(
    createAdminAuthService(createAdminAuthRepository(database)),
  );
  router.use(requireAdmin);
  router.use(createRequireAdminPermission("scenarios.access"));
  router.get("/", async (_request, response) => {
    response.json(await repository.list());
  });
  router.post(
    "/scenarios",
    validateRequest({ body: agentScenarioBodySchema }),
    async (request, response) => {
      response.json({ scenario: await repository.saveScenario(request.body) });
    },
  );
  router.post(
    "/transfer-rules",
    validateRequest({ body: agentTransferRuleBodySchema }),
    async (request, response) => {
      response.json({
        transferRule: await repository.saveTransferRule(request.body),
      });
    },
  );
  return router;
};
