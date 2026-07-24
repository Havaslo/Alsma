import { Router, raw } from "express";
import { z } from "zod";

import type { Database } from "../../lib/database/database.js";
import { HttpError } from "../../lib/http/http-error.js";
import { validateRequest } from "../../lib/http/validate-request.js";
import type { ManagedStorageUpload } from "../../lib/storage/managed-storage.js";
import {
  createRequireAdmin,
  createRequireAdminPermission,
} from "../admin-auth/admin-auth.middleware.js";
import { createAdminAuthRepository } from "../admin-auth/admin-auth.repository.js";
import { createAdminAuthService } from "../admin-auth/admin-auth.service.js";

const fileParamsSchema = z.object({ fileId: z.uuid() });
const managedFileParamsSchema = z.object({
  objectToken: z
    .string()
    .regex(/^[A-Za-z0-9_-]+$/)
    .max(4_096),
});
const managedUploadBodySchema = z.object({
  contentType: z.enum([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/svg+xml",
    "video/mp4",
    "video/webm",
  ]),
  fileName: z.string().trim().min(1).max(255),
  sizeBytes: z
    .number()
    .int()
    .positive()
    .max(50 * 1_024 * 1_024),
});
const allowedTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "video/mp4",
  "video/webm",
]);

type ManagedStorage = {
  readonly createUpload: (input: {
    readonly contentType: string;
    readonly name: string;
    readonly sizeBytes: number;
  }) => Promise<ManagedStorageUpload>;
  readonly getDownload: (
    objectId: string,
  ) => Promise<{ readonly downloadUrl: string }>;
};

const encodeObjectId = (objectId: string): string =>
  Buffer.from(objectId, "utf8").toString("base64url");

const decodeObjectId = (token: string): string => {
  try {
    const objectId = Buffer.from(token, "base64url").toString("utf8");
    if (!objectId || encodeObjectId(objectId) !== token)
      throw new Error("Invalid object id");
    return objectId;
  } catch {
    throw new HttpError(
      400,
      "MEDIA_OBJECT_INVALID",
      "Некорректный идентификатор файла.",
    );
  }
};

export const createMediaRouter = (
  database: Database,
  managedStorage: ManagedStorage,
): Router => {
  const router = Router();
  const requireAdmin = createRequireAdmin(
    createAdminAuthService(createAdminAuthRepository(database)),
  );
  const requireSiteManagement = createRequireAdminPermission("site.manage");

  router.get(
    "/managed/:objectToken",
    validateRequest({ params: managedFileParamsSchema }),
    async (_request, response) => {
      const objectId = decodeObjectId(response.locals.input.params.objectToken);
      const download = await managedStorage.getDownload(objectId);
      response.redirect(307, download.downloadUrl);
    },
  );
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
    requireAdmin,
    requireSiteManagement,
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
  router.post(
    "/admin/uploads",
    requireAdmin,
    requireSiteManagement,
    validateRequest({ body: managedUploadBodySchema }),
    async (_request, response) => {
      const input = response.locals.input.body;
      const upload = await managedStorage.createUpload({
        contentType: input.contentType,
        name: input.fileName,
        sizeBytes: input.sizeBytes,
      });
      const objectToken = encodeObjectId(upload.objectId);
      response.status(201).json({
        asset: {
          contentType: input.contentType,
          fileName: input.fileName,
          objectId: upload.objectId,
          sizeBytes: input.sizeBytes,
          url: `/api/media/managed/${objectToken}?contentType=${encodeURIComponent(
            input.contentType,
          )}`,
        },
        upload,
      });
    },
  );
  return router;
};
