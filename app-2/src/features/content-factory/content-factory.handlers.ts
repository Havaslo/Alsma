import type { RequestHandler } from "express";

import type { Database } from "../../lib/database/database.js";
import { HttpError } from "../../lib/http/http-error.js";
import type { ManagedStorage } from "../../lib/storage/managed-storage.js";
import type { ContentFactoryAiService } from "./content-factory-ai.service.js";
import { createContentFactoryRepository } from "./content-factory.repository.js";

const allowedImageTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const maxUploadBytes = 50 * 1_024 * 1_024;

const getStorageFileName = (fileName: string) =>
  fileName.replace(/[\\/]/g, "_").replace(/[^\x20-\x7E]/g, "_") || "image";

const encodeObjectId = (objectId: string): string =>
  Buffer.from(objectId, "utf8").toString("base64url");

const formatFileSize = (sizeBytes: number) =>
  sizeBytes >= 1_048_576
    ? `${(sizeBytes / 1_048_576).toFixed(1)} МБ`
    : `${Math.max(1, Math.round(sizeBytes / 1_024))} КБ`;

const toMediaAsset = (media: {
  readonly contentType: string;
  readonly createdAt: Date;
  readonly fileName: string;
  readonly id: string;
  readonly objectId: string;
  readonly sizeBytes: number;
}) => ({
  category: "Загрузки",
  contentType: media.contentType,
  createdAt: media.createdAt,
  fileName: media.fileName,
  id: media.id,
  image: `/api/media/managed/${encodeObjectId(media.objectId)}?contentType=${encodeURIComponent(media.contentType)}`,
  sizeBytes: media.sizeBytes,
  subtitle: formatFileSize(media.sizeBytes),
  title: media.fileName,
  tags: [],
});

export const createListContentFactoryDraftsHandler =
  (database: Database): RequestHandler =>
  async (_request, response) => {
    const repository = createContentFactoryRepository(database);
    response.json({ items: await repository.listDrafts() });
  };

export const createSaveContentFactoryDraftHandler =
  (database: Database, update: boolean): RequestHandler =>
  async (_request, response) => {
    const { body, params } = response.locals.input;
    const repository = createContentFactoryRepository(database);
    const draft = update
      ? await repository.updateDraft(params.draftId, body)
      : await repository.createDraft(response.locals.admin.id, body);
    if (!draft) {
      throw new HttpError(
        404,
        "CONTENT_FACTORY_DRAFT_NOT_FOUND",
        "Черновик не найден. Обновите список и попробуйте снова.",
      );
    }
    response.status(update ? 200 : 201).json({ draft });
  };

export const createListContentFactoryMediaHandler =
  (database: Database): RequestHandler =>
  async (_request, response) => {
    const repository = createContentFactoryRepository(database);
    const items = await repository.listMedia();
    response.json({ items: items.map(toMediaAsset) });
  };

export const createUploadContentFactoryMediaHandler =
  (database: Database, managedStorage: ManagedStorage): RequestHandler =>
  async (request, response) => {
    const contentType = request.headers["content-type"]?.split(";")[0] ?? "";
    if (!allowedImageTypes.has(contentType)) {
      throw new HttpError(
        400,
        "CONTENT_FACTORY_MEDIA_TYPE_INVALID",
        "Загрузите изображение в формате JPG, PNG, WebP или GIF.",
      );
    }
    if (
      !Buffer.isBuffer(request.body) ||
      request.body.length === 0 ||
      request.body.length > maxUploadBytes
    ) {
      throw new HttpError(
        400,
        "CONTENT_FACTORY_MEDIA_INVALID",
        "Выберите непустое изображение размером не более 50 МБ.",
      );
    }

    const { fileName } = response.locals.input.query;
    let stored: { readonly objectId: string };
    try {
      stored = await managedStorage.upload({
        content: Uint8Array.from(request.body),
        contentType,
        name: getStorageFileName(fileName),
      });
    } catch (error) {
      request.log.error({ error }, "Content factory media upload failed");
      throw new HttpError(
        502,
        "CONTENT_FACTORY_MEDIA_UPLOAD_FAILED",
        "Не удалось сохранить изображение. Попробуйте ещё раз.",
      );
    }

    try {
      const repository = createContentFactoryRepository(database);
      const media = await repository.createMedia({
        adminId: response.locals.admin.id,
        contentType,
        fileName,
        objectId: stored.objectId,
        sizeBytes: request.body.length,
      });
      response.status(201).json({ asset: toMediaAsset(media) });
    } catch (error) {
      await managedStorage
        .deleteObject(stored.objectId)
        .catch((cleanupError) => {
          request.log.warn(
            { cleanupError },
            "Orphaned content factory media cleanup failed",
          );
        });
      throw error;
    }
  };

export const createGenerateContentFactoryTextHandler =
  (ai: ContentFactoryAiService): RequestHandler =>
  async (request, response) => {
    const result = await ai.generateText({
      ...response.locals.input.query,
      referencePhoto: request.body,
      referencePhotoContentType:
        request.headers["content-type"]?.split(";")[0] ?? "",
    });
    response.json(result);
  };

export const createRefineContentFactoryTextHandler =
  (ai: ContentFactoryAiService): RequestHandler =>
  async (_request, response) => {
    const result = await ai.refineText(response.locals.input.body);
    response.json(result);
  };

export const createGenerateContentFactoryImageHandler =
  (ai: ContentFactoryAiService): RequestHandler =>
  async (request, response) => {
    const media = await ai.generateImage({
      ...response.locals.input.query,
      adminId: response.locals.admin.id,
      referencePhoto: request.body,
      referencePhotoContentType:
        request.headers["content-type"]?.split(";")[0] ?? "",
    });
    response.status(201).json({ asset: toMediaAsset(media) });
  };

export const contentFactoryUploadLimit = `${maxUploadBytes}b`;
