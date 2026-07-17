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
  createBookingHandler,
  createCompleteTaskHandler,
  createDeleteClientHandler,
  createListBookingsHandler,
  createListClientsHandler,
  createListRequestsHandler,
  createListTasksHandler,
  createMarkBookingPaidHandler,
  createUpdateBonusHandler,
  createUpdateClientHandler,
  createUpdateRequestHandler,
} from "./admin-operations.handlers.js";
import { createAdminOperationsRepository } from "./admin-operations.repository.js";
import {
  adminOperationsQuerySchema,
  createBookingBodySchema,
  recordParamsSchema,
  updateBonusBodySchema,
  updateClientBodySchema,
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
  router.use(
    createRequireAdminPermission("dashboard.access", "requests.access"),
  );
  router.get(
    "/bookings",
    validateRequest({ query: adminOperationsQuerySchema }),
    createListBookingsHandler(repository),
  );
  router.post(
    "/bookings",
    validateRequest({ body: createBookingBodySchema }),
    createBookingHandler(repository),
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
  router.put(
    "/clients/:recordId",
    validateRequest({
      body: updateClientBodySchema,
      params: recordParamsSchema,
    }),
    createUpdateClientHandler(repository),
  );
  router.delete(
    "/clients/:recordId",
    validateRequest({ params: recordParamsSchema }),
    createDeleteClientHandler(repository),
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
