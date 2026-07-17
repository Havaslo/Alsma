import { Router, raw } from "express";
import { z } from "zod";

import type { Database } from "../../lib/database/database.js";
import { HttpError } from "../../lib/http/http-error.js";
import { validateRequest } from "../../lib/http/validate-request.js";
import {
  createRequireAdmin,
  createRequireAdminPermission,
} from "../admin-auth/admin-auth.middleware.js";
import { createAdminAuthRepository } from "../admin-auth/admin-auth.repository.js";
import { createAdminAuthService } from "../admin-auth/admin-auth.service.js";

const fileParamsSchema = z.object({ fileId: z.uuid() });
const allowedTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "video/mp4",
  "video/webm",
]);

export const createMediaRouter = (database: Database): Router => {
  const router = Router();
  router.get(
    "/:fileId",
    validateRequest({ params: fileParamsSchema }),
    async (_request, response) => {
      const file = await database.client.uploadedFile.findUnique({
        where: { id: response.locals.input.params.fileId },
      });
      if (!file) throw new HttpError(404, "MEDIA_NOT_FOUND", "Файл не найден.");
      response.setHeader("Content-Type", file.contentType);
      response.setHeader("Content-Length", String(file.sizeBytes));
      response.setHeader(
        "Cache-Control",
        "public, max-age=31536000, immutable",
      );
      response.send(Buffer.from(file.content));
    },
  );
  router.post(
    "/admin/upload",
    createRequireAdmin(
      createAdminAuthService(createAdminAuthRepository(database)),
    ),
    createRequireAdminPermission("site.manage"),
    raw({ limit: "10mb", type: () => true }),
    async (request, response) => {
      const contentType = request.headers["content-type"]?.split(";")[0] ?? "";
      const fileName = String(request.headers["x-file-name"] ?? "upload").slice(
        0,
        255,
      );
      if (!allowedTypes.has(contentType))
        throw new HttpError(
          400,
          "MEDIA_TYPE_INVALID",
          "Поддерживаются изображения и MP4/WebM-видео.",
        );
      if (!Buffer.isBuffer(request.body) || request.body.length === 0)
        throw new HttpError(400, "MEDIA_EMPTY", "Выберите непустой файл.");
      const file = await database.client.uploadedFile.create({
        data: {
          category: String(
            request.headers["x-media-category"] ?? "site-content",
          ).slice(0, 80),
          content: Uint8Array.from(request.body),
          contentType,
          fileName,
          sizeBytes: request.body.length,
        },
      });
      response.status(201).json({
        file: {
          contentType: file.contentType,
          fileName: file.fileName,
          id: file.id,
          sizeBytes: file.sizeBytes,
          url: `/api/media/${file.id}`,
        },
      });
    },
  );
  return router;
};
