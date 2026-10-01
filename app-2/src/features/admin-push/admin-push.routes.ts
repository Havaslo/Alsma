import { Router } from "express";
import type { Logger } from "pino";

import type { Database } from "../../lib/database/database.js";
import { validateRequest } from "../../lib/http/validate-request.js";
import {
  createRequireAdmin,
  createRequireAdminPermission,
} from "../admin-auth/admin-auth.middleware.js";
import { createAdminAuthRepository } from "../admin-auth/admin-auth.repository.js";
import { createAdminAuthService } from "../admin-auth/admin-auth.service.js";
import { createAdminPushRepository } from "./admin-push.repository.js";
import {
  pushSubscriptionBodySchema,
  pushSubscriptionEndpointBodySchema,
} from "./admin-push.schemas.js";
import { createAdminPushService } from "./admin-push.service.js";
import type { AdminPushConfiguration } from "./admin-push.types.js";

const notificationPermissions = [
  "leads.access",
  "requests.access",
  "dashboard.access",
] as const;

export const createAdminPushRouter = (
  database: Database,
  configuration: AdminPushConfiguration,
  logger: Logger,
): Router => {
  const router = Router();
  const auth = createAdminAuthService(createAdminAuthRepository(database));
  const push = createAdminPushService(
    createAdminPushRepository(database),
    configuration,
    logger,
  );
  router.use(createRequireAdmin(auth));
  router.use(createRequireAdminPermission(...notificationPermissions));

  router.get("/configuration", (_request, response) => {
    response.json({
      enabled: push.enabled,
      publicKey: push.enabled ? configuration.publicKey : null,
    });
  });
  router.post(
    "/subscription/status",
    validateRequest({ body: pushSubscriptionEndpointBodySchema }),
    async (_request, response) => {
      const { endpoint } = response.locals.input.body as { endpoint: string };
      const admin = response.locals.admin as { id: string };
      response.json({
        subscribed: await push.hasSubscription(admin.id, endpoint),
      });
    },
  );
  router.post(
    "/subscription",
    validateRequest({ body: pushSubscriptionBodySchema }),
    async (_request, response) => {
      const body = response.locals.input.body as {
        endpoint: string;
        keys: { auth: string; p256dh: string };
      };
      const admin = response.locals.admin as { id: string };
      await push.saveSubscription(admin.id, body);
      response.status(201).json({ subscribed: true });
    },
  );
  router.delete(
    "/subscription",
    validateRequest({ body: pushSubscriptionEndpointBodySchema }),
    async (_request, response) => {
      const { endpoint } = response.locals.input.body as { endpoint: string };
      const admin = response.locals.admin as { id: string };
      await push.deleteSubscription(admin.id, endpoint);
      response.json({ subscribed: false });
    },
  );
  return router;
};
