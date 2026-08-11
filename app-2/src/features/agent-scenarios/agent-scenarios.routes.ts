import { Router } from "express";
import { z } from "zod";

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
  agentSettingsSchema,
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
    response.json({
      ...(await repository.list()),
      settings: await repository.getSettings(),
    });
  });
  router.get("/settings", async (_request, response) => {
    response.json({ settings: await repository.getSettings() });
  });
  router.put(
    "/settings",
    validateRequest({ body: agentSettingsSchema }),
    async (request, response) => {
      response.json({ settings: await repository.saveSettings(request.body) });
    },
  );
  router.post(
    "/scenarios",
    validateRequest({ body: agentScenarioBodySchema }),
    async (request, response) => {
      response.json({ scenario: await repository.saveScenario(request.body) });
    },
  );
  router.delete("/scenarios/:id", async (request, response) => {
    const id = z.string().uuid().parse(request.params.id);
    await repository.deleteScenario(id);
    response.status(204).send();
  });
  router.delete("/transfer-rules/:id", async (request, response) => {
    const id = z.string().uuid().parse(request.params.id);
    await repository.deleteTransferRule(id);
    response.status(204).send();
  });
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
