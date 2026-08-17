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
  createDeleteAdminUserHandler,
  createListAdminSettingsHandler,
  createSaveAdminRoleHandler,
  createSaveAdminUserHandler,
} from "./admin-settings.handlers.js";
import { createAdminSettingsRepository } from "./admin-settings.repository.js";
import {
  adminRoleBodySchema,
  adminUserBodySchema,
  createAdminUserBodySchema,
  entityIdParamsSchema,
} from "./admin-settings.schemas.js";
import { createAdminSettingsService } from "./admin-settings.service.js";

export const createAdminIntegrationsStatusRouter = (
  database: Database,
  configured: Record<string, boolean>,
): Router => {
  const router = Router();
  router.use(
    createRequireAdmin(
      createAdminAuthService(createAdminAuthRepository(database)),
    ),
    createRequireAdminPermission("integrations.access"),
  );
  router.get("/status", (_request, response) =>
    response.json({
      items: Object.entries(configured).map(([id, isConfigured]) => ({
        id,
        configured: isConfigured,
      })),
    }),
  );
  return router;
};

export const createAdminSettingsRouter = (database: Database): Router => {
  const router = Router();
  const service = createAdminSettingsService(
    createAdminSettingsRepository(database),
  );
  router.use(
    createRequireAdmin(
      createAdminAuthService(createAdminAuthRepository(database)),
    ),
  );
  router.use(createRequireAdminPermission("settings.access"));
  router.get("/", createListAdminSettingsHandler(service));
  router.post(
    "/roles",
    validateRequest({ body: adminRoleBodySchema }),
    createSaveAdminRoleHandler(service, false),
  );
  router.put(
    "/roles/:id",
    validateRequest({
      body: adminRoleBodySchema,
      params: entityIdParamsSchema,
    }),
    createSaveAdminRoleHandler(service, true),
  );
  router.post(
    "/users",
    validateRequest({ body: createAdminUserBodySchema }),
    createSaveAdminUserHandler(service, false),
  );
  router.put(
    "/users/:id",
    validateRequest({
      body: adminUserBodySchema,
      params: entityIdParamsSchema,
    }),
    createSaveAdminUserHandler(service, true),
  );
  router.delete(
    "/users/:id",
    validateRequest({ params: entityIdParamsSchema }),
    createDeleteAdminUserHandler(service),
  );
  return router;
};
