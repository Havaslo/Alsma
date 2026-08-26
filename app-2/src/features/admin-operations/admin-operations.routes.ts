import { Router } from "express";
import { z } from "zod";

import type { Database } from "../../lib/database/database.js";
import { validateRequest } from "../../lib/http/validate-request.js";
import type { ManagedStorage } from "../../lib/storage/managed-storage.js";
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
  createGetClientHandler,
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

export const createAdminOperationsRouter = (
  database: Database,
  managedStorage?: ManagedStorage,
): Router => {
  const router = Router();
  const repository = createAdminOperationsRepository(database);
  router.use(
    createRequireAdmin(
      createAdminAuthService(createAdminAuthRepository(database)),
    ),
  );
  router.get(
    "/analytics",
    createRequireAdminPermission("dashboard.access"),
    async (request, response) => {
      const parsed = z
        .object({ start: z.coerce.date(), end: z.coerce.date() })
        .safeParse(request.query);
      if (!parsed.success) {
        response
          .status(400)
          .json({ error: { code: "INVALID_ANALYTICS_RANGE" } });
        return;
      }
      const end = new Date(parsed.data.end);
      end.setDate(end.getDate() + 1);
      response.json({
        analytics: await repository.getAnalytics(parsed.data.start, end),
      });
    },
  );
  router.get(
    "/notifications",
    createRequireAdminPermission(
      "leads.access",
      "requests.access",
      "dashboard.access",
    ),
    async (_request, response) => {
      const result = await repository.listNotifications();
      response.json({
        ...result,
        items: result.items.map((item) => ({
          ...item,
          createdAt: item.createdAt.toISOString(),
        })),
      });
    },
  );
  router.get(
    "/bookings",
    createRequireAdminPermission("dashboard.access"),
    validateRequest({ query: adminOperationsQuerySchema }),
    createListBookingsHandler(repository),
  );
  router.post(
    "/bookings",
    createRequireAdminPermission("dashboard.access"),
    validateRequest({ body: createBookingBodySchema }),
    createBookingHandler(repository),
  );
  router.post(
    "/bookings/:recordId/mark-paid",
    createRequireAdminPermission("dashboard.access"),
    validateRequest({ params: recordParamsSchema }),
    createMarkBookingPaidHandler(repository),
  );
  router.get(
    "/clients",
    createRequireAdminPermission("dashboard.access"),
    validateRequest({ query: adminOperationsQuerySchema }),
    createListClientsHandler(repository),
  );
  router.get(
    "/clients/:recordId",
    createRequireAdminPermission("dashboard.access"),
    validateRequest({ params: recordParamsSchema }),
    createGetClientHandler(repository),
  );
  router.put(
    "/clients/:recordId/bonus",
    createRequireAdminPermission("dashboard.access"),
    validateRequest({
      body: updateBonusBodySchema,
      params: recordParamsSchema,
    }),
    createUpdateBonusHandler(repository),
  );
  router.put(
    "/clients/:recordId",
    createRequireAdminPermission("dashboard.access"),
    validateRequest({
      body: updateClientBodySchema,
      params: recordParamsSchema,
    }),
    createUpdateClientHandler(repository),
  );
  router.delete(
    "/clients/:recordId",
    createRequireAdminPermission("dashboard.access"),
    validateRequest({ params: recordParamsSchema }),
    createDeleteClientHandler(repository),
  );
  router.get(
    "/requests",
    createRequireAdminPermission("requests.access", "voice.calls.access"),
    validateRequest({ query: adminOperationsQuerySchema }),
    createListRequestsHandler(repository),
  );
  router.get(
    "/voice-calls/:recordId/recording",
    createRequireAdminPermission("voice.calls.access", "requests.access"),
    validateRequest({ params: recordParamsSchema }),
    async (_request, response) => {
      if (!managedStorage) {
        response.status(404).json({ error: { code: "RECORDING_UNAVAILABLE" } });
        return;
      }
      const call = await database.client.voiceCall.findUnique({
        where: { id: response.locals.input.params.recordId },
        select: { recordingObjectId: true },
      });
      if (!call?.recordingObjectId) {
        response.status(404).json({ error: { code: "RECORDING_NOT_FOUND" } });
        return;
      }
      response.json(await managedStorage.getDownload(call.recordingObjectId));
    },
  );
  router.patch(
    "/requests/:recordId",
    createRequireAdminPermission("requests.access"),
    validateRequest({
      body: updateRequestStatusBodySchema,
      params: recordParamsSchema,
    }),
    createUpdateRequestHandler(repository),
  );
  router.get(
    "/manager-tasks",
    createRequireAdminPermission("dashboard.access", "requests.access"),
    validateRequest({ query: adminOperationsQuerySchema }),
    createListTasksHandler(repository),
  );
  router.post(
    "/manager-tasks/:recordId/complete",
    createRequireAdminPermission("dashboard.access", "requests.access"),
    validateRequest({ params: recordParamsSchema }),
    createCompleteTaskHandler(repository),
  );
  return router;
};
