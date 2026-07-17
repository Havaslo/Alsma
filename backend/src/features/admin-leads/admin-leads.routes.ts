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
  createListAdminLeadsHandler,
  createUpdateAdminLeadHandler,
} from "./admin-leads.handlers.js";
import { createAdminLeadsRepository } from "./admin-leads.repository.js";
import {
  adminLeadParamsSchema,
  adminLeadsQuerySchema,
  updateAdminLeadBodySchema,
} from "./admin-leads.schemas.js";

export const createAdminLeadsRouter = (database: Database): Router => {
  const router = Router();
  const auth = createRequireAdmin(
    createAdminAuthService(createAdminAuthRepository(database)),
  );
  const repository = createAdminLeadsRepository(database);
  router.use(auth);
  router.use(createRequireAdminPermission("leads.access"));
  router.get(
    "/",
    validateRequest({ query: adminLeadsQuerySchema }),
    createListAdminLeadsHandler(repository),
  );
  router.patch(
    "/:leadId",
    validateRequest({
      body: updateAdminLeadBodySchema,
      params: adminLeadParamsSchema,
    }),
    createUpdateAdminLeadHandler(repository),
  );
  return router;
};
