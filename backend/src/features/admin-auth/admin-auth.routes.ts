import { Router } from "express";

import type { Database } from "../../lib/database/database.js";
import { validateRequest } from "../../lib/http/validate-request.js";
import {
  createAdminInitializeHandler,
  createAdminLoginHandler,
  createAdminLogoutHandler,
  createAdminMeHandler,
  createAdminStatusHandler,
} from "./admin-auth.handlers.js";
import { createRequireAdmin } from "./admin-auth.middleware.js";
import { createAdminAuthRepository } from "./admin-auth.repository.js";
import {
  adminCredentialsSchema,
  initializeAdminBodySchema,
} from "./admin-auth.schemas.js";
import { createAdminAuthService } from "./admin-auth.service.js";

export const createAdminAuthRouter = (database: Database): Router => {
  const router = Router();
  const service = createAdminAuthService(createAdminAuthRepository(database));
  router.get("/status", createAdminStatusHandler(service));
  router.post(
    "/initialize",
    validateRequest({ body: initializeAdminBodySchema }),
    createAdminInitializeHandler(service),
  );
  router.post(
    "/login",
    validateRequest({ body: adminCredentialsSchema }),
    createAdminLoginHandler(service),
  );
  router.get("/me", createRequireAdmin(service), createAdminMeHandler(service));
  router.post(
    "/logout",
    createRequireAdmin(service),
    createAdminLogoutHandler(service),
  );
  return router;
};
