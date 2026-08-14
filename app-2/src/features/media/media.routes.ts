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
import { renderFirstPdfPage } from "./pdf-preview.js";

const fileParamsSchema = z.object({ fileId: z.uuid() });
const managedFileParamsSchema = z.object({
  objectToken: z
    .string()
    .regex(/^[A-Za-z0-9_-]+$/)
    .max(4_096),
});
const managedUploadQuerySchema = z.object({
  fileName: z.string().trim().min(1).max(255),
});
const managedPreviewBodySchema = z.object({
  objectToken: z
    .string()
    .regex(/^[A-Za-z0-9_-]+$/)
    .max(4_096),
});
const allowedTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "video/mp4",
  "video/webm",
  "application/pdf",
]);

const maxUploadBytes = 50 * 1_024 * 1_024;

// Keep the name shown in the CMS, but send an ASCII filename to storage.
// Some multipart storage gateways reject UTF-8 filenames in Content-Disposition.
const getStorageFileName = (fileName: string) => {
  const safeName = fileName.replace(/[^\x20-\x7E]/g, "_");
  return safeName || "upload";
};

type ManagedStorage = {
  readonly upload: (input: {
    readonly content: Uint8Array;
    readonly contentType: string;
    readonly name: string;
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

const createPdfPreviewAsset = async (
  managedStorage: ManagedStorage,
  content: Buffer,
  fileName: string,
  request: {
    readonly log: { readonly warn: (data: unknown, message: string) => void };
  },
): Promise<{ readonly previewUrl: string } | undefined> => {
  let preview: Uint8Array;
  try {
    preview = await renderFirstPdfPage(content);
  } catch (error) {
    request.log.warn({ error }, "PDF first-page rendering failed");
    return undefined;
  }
  try {
    const previewUpload = await managedStorage.upload({
      content: preview,
      contentType: "image/jpeg",
      name: `${getStorageFileName(fileName)}.preview.jpg`,
    });
    const previewToken = encodeObjectId(previewUpload.objectId);
    return {
      previewUrl: `/api/media/managed/${previewToken}?contentType=image%2Fjpeg`,
    };
  } catch (error) {
    request.log.warn({ error }, "Managed PDF preview upload failed");
    return undefined;
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
    async (request, response) => {
      const objectId = decodeObjectId(response.locals.input.params.objectToken);
      const download = await managedStorage.getDownload(objectId);
      const storageResponse = await fetch(download.downloadUrl);
      if (!storageResponse.ok) {
        request.log.error(
          { status: storageResponse.status },
          "Managed media download failed",
        );
        throw new HttpError(
          502,
          "MEDIA_STORAGE_DOWNLOAD_FAILED",
          "Не удалось получить файл из хранилища.",
        );
      }

      const contentType =
        storageResponse.headers.get("content-type") ??
        "application/octet-stream";
      const contentLength = storageResponse.headers.get("content-length");
      response.setHeader("Content-Type", contentType);
      if (contentLength) response.setHeader("Content-Length", contentLength);
      response.setHeader("Content-Disposition", "inline");
      response.setHeader("Cache-Control", "public, max-age=3600");
      response.setHeader("X-Content-Type-Options", "nosniff");
      response.setHeader("Cross-Origin-Opener-Policy", "unsafe-none");
      response.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      response.send(Buffer.from(await storageResponse.arrayBuffer()));
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
    "/admin/pdf-preview",
    requireAdmin,
    requireSiteManagement,
    validateRequest({ body: managedPreviewBodySchema }),
    async (request, response) => {
      const objectId = decodeObjectId(response.locals.input.body.objectToken);
      const download = await managedStorage.getDownload(objectId);
      const storageResponse = await fetch(download.downloadUrl);
      if (!storageResponse.ok) {
        throw new HttpError(
          502,
          "MEDIA_STORAGE_DOWNLOAD_FAILED",
          "Не удалось получить PDF из хранилища.",
        );
      }
      const preview = await createPdfPreviewAsset(
        managedStorage,
        Buffer.from(await storageResponse.arrayBuffer()),
        "document.pdf",
        request,
      );
      if (!preview) {
        throw new HttpError(
          422,
          "MEDIA_PDF_PREVIEW_FAILED",
          "Не удалось отрендерить первую страницу PDF.",
        );
      }
      response.json(preview);
    },
  );
  router.post(
    "/admin/uploads",
    requireAdmin,
    requireSiteManagement,
    raw({ limit: `${maxUploadBytes}b`, type: () => true }),
    validateRequest({ query: managedUploadQuerySchema }),
    async (request, response) => {
      const contentType = request.headers["content-type"]?.split(";")[0] ?? "";
      if (!allowedTypes.has(contentType))
        throw new HttpError(
          400,
          "MEDIA_TYPE_INVALID",
          "Поддерживаются изображения, PDF и MP4/WebM-видео.",
        );
      if (!Buffer.isBuffer(request.body) || request.body.length === 0)
        throw new HttpError(400, "MEDIA_EMPTY", "Выберите непустой файл.");

      const fileName = response.locals.input.query.fileName;
      let upload: ManagedStorageUpload;
      try {
        upload = await managedStorage.upload({
          content: Uint8Array.from(request.body),
          contentType,
          name: getStorageFileName(fileName),
        });
      } catch (error) {
        request.log.error({ error }, "Managed media upload failed");
        throw new HttpError(
          502,
          "MEDIA_STORAGE_UPLOAD_FAILED",
          "Не удалось сохранить файл в хранилище. Попробуйте ещё раз.",
        );
      }
      const objectToken = encodeObjectId(upload.objectId);
      const asset = {
        contentType,
        fileName,
        objectId: upload.objectId,
        sizeBytes: request.body.length,
        url: `/api/media/managed/${objectToken}?contentType=${encodeURIComponent(
          contentType,
        )}`,
        ...(contentType === "application/pdf"
          ? await createPdfPreviewAsset(
              managedStorage,
              request.body,
              fileName,
              request,
            )
          : {}),
      };
      response.status(201).json({ asset });
    },
  );
  return router;
};
