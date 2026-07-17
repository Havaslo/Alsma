import { Router } from "express";

import type { Database } from "../../lib/database/database.js";
import { validateRequest } from "../../lib/http/validate-request.js";
import { createRequireAdmin } from "../admin-auth/admin-auth.middleware.js";
import { createAdminAuthRepository } from "../admin-auth/admin-auth.repository.js";
import { createAdminAuthService } from "../admin-auth/admin-auth.service.js";
import {
  createCompleteTaskHandler,
  createListBookingsHandler,
  createListClientsHandler,
  createListRequestsHandler,
  createListTasksHandler,
  createMarkBookingPaidHandler,
  createUpdateBonusHandler,
  createUpdateRequestHandler,
} from "./admin-operations.handlers.js";
import { createAdminOperationsRepository } from "./admin-operations.repository.js";
import {
  adminOperationsQuerySchema,
  recordParamsSchema,
  updateBonusBodySchema,
  updateRequestStatusBodySchema,
} from "./admin-operations.schemas.js";

export const createAdminOperationsRouter = (database: Database): Router => {
  const router = Router();
  const repository = createAdminOperationsRepository(database);
  router.use(
    createRequireAdmin(
      createAdminAuthService(createAdminAuthRepository(database)),
    ),
  );
  router.get(
    "/bookings",
    validateRequest({ query: adminOperationsQuerySchema }),
    createListBookingsHandler(repository),
  );
  router.post(
    "/bookings/:recordId/mark-paid",
    validateRequest({ params: recordParamsSchema }),
    createMarkBookingPaidHandler(repository),
  );
  router.get(
    "/clients",
    validateRequest({ query: adminOperationsQuerySchema }),
    createListClientsHandler(repository),
  );
  router.put(
    "/clients/:recordId/bonus",
    validateRequest({
      body: updateBonusBodySchema,
      params: recordParamsSchema,
    }),
    createUpdateBonusHandler(repository),
  );
  router.get(
    "/requests",
    validateRequest({ query: adminOperationsQuerySchema }),
    createListRequestsHandler(repository),
  );
  router.patch(
    "/requests/:recordId",
    validateRequest({
      body: updateRequestStatusBodySchema,
      params: recordParamsSchema,
    }),
    createUpdateRequestHandler(repository),
  );
  router.get(
    "/manager-tasks",
    validateRequest({ query: adminOperationsQuerySchema }),
    createListTasksHandler(repository),
  );
  router.post(
    "/manager-tasks/:recordId/complete",
    validateRequest({ params: recordParamsSchema }),
    createCompleteTaskHandler(repository),
  );
  return router;
};
