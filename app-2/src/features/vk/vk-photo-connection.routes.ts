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
import type { VkPhotoConnectionService } from "./vk-photo-connection.service.js";

export const createVkPhotoConnectionRouter = (
  database: Database,
  connection: VkPhotoConnectionService,
): Router => {
  const router = Router();
  router.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Referrer-Policy", "no-referrer");
    next();
  });
  const requireAdmin = createRequireAdmin(
    createAdminAuthService(createAdminAuthRepository(database)),
  );
  const requireManage = createRequireAdminPermission(
    "site.access",
    "site.manage",
  );
  router.get("/status", requireAdmin, requireManage, async (_req, res) => {
    res.json(await connection.status());
  });
  router.post(
    "/connect/start",
    requireAdmin,
    requireManage,
    validateRequest({ body: z.object({}).strict() }),
    async (req, res) => {
      res.json(await connection.start(req.get("Origin")));
    },
  );
  router.get(
    "/callback",
    validateRequest({
      query: z.object({
        state: z.string().max(256).optional(),
        code: z.string().max(4096).optional(),
        error: z.string().max(256).optional(),
        error_description: z.string().max(4096).optional(),
      }),
    }),
    async (_req, res) => {
      const result = await connection.complete(res.locals.input.query);
      if (!result.origin) {
        res.status(400).json({ code: "VK_PHOTO_ORIGIN_MISSING" });
        return;
      }
      const destination = new URL("/admin/content-factory", result.origin);
      destination.searchParams.set("vkPhotoConnection", result.result);
      res.redirect(303, destination.toString());
    },
  );
  return router;
};
