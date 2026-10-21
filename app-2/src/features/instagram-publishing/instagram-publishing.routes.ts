import { Router } from "express";
import type { Logger } from "pino";

import type { Database } from "../../lib/database/database.js";
import {
  createRequireAdmin,
  createRequireAdminPermission,
} from "../admin-auth/admin-auth.middleware.js";
import { createAdminAuthRepository } from "../admin-auth/admin-auth.repository.js";
import { createAdminAuthService } from "../admin-auth/admin-auth.service.js";
import {
  createInstagramConnectionService,
  type InstagramPublishingConfiguration,
} from "./instagram-connection.service.js";

export const createInstagramPublishingRouter = (options: {
  readonly allowedOrigins: readonly string[];
  readonly configuration: InstagramPublishingConfiguration;
  readonly database: Database;
  readonly environment: "development" | "production" | "test";
  readonly logger: Logger;
}): Router => {
  const router = Router();
  const connection = createInstagramConnectionService(options);
  const auth = createAdminAuthService(
    createAdminAuthRepository(options.database),
  );
  const requireAdmin = createRequireAdmin(auth);
  const requireContentManagement = createRequireAdminPermission(
    "site.access",
    "site.manage",
  );

  router.get(
    "/status",
    requireAdmin,
    requireContentManagement,
    async (_request, response) => {
      response.json(await connection.status());
    },
  );

  router.post(
    "/connect/start",
    requireAdmin,
    requireContentManagement,
    async (request, response) => {
      const result = await connection.start(request.get("Origin"));
      if (!result.configured) {
        response.status(409).json({
          code: "INSTAGRAM_CONNECTION_NOT_CONFIGURED",
          message: "Подключение Instagram ещё не настроено в приложении Meta.",
        });
        return;
      }
      response.json({ authorizationUrl: result.authorizationUrl });
    },
  );

  router.get("/callback", async (request, response) => {
    const result = await connection.complete({
      code:
        typeof request.query.code === "string" ? request.query.code : undefined,
      error:
        typeof request.query.error === "string"
          ? request.query.error
          : undefined,
      state:
        typeof request.query.state === "string"
          ? request.query.state
          : undefined,
    });
    const destination = new URL("/admin/content-factory", result.returnOrigin);
    destination.searchParams.set("instagramConnection", result.result);
    response.redirect(303, destination.toString());
  });

  return router;
};
