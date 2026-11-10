import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";

import type { Database } from "../../lib/database/database.js";
import { HttpError } from "../../lib/http/http-error.js";
import { photoAuthDiagnostic } from "../vk/vk-photo-auth-diagnostic.js";
import { VkApiError, VkPhotoUploadEmptyError } from "../vk/vk.client.js";

const attachmentSchema = z
  .string()
  .regex(/^photo-?\d+_\d+(?:_[a-zA-Z0-9_-]+)?$/u);
// VK may save wall-upload photos under a user ID and copy them when posted.
// Trust an explicit wall-upload provenance, never an arbitrary user-album ID.
const communityAttachment = (attachment: string, groupId: string) =>
  attachment.startsWith(`photo-${groupId}_`);
const readySchema = z.object({
  attachment: attachmentSchema,
  preparedAt: z.string(),
  kind: z.literal("wall").optional(),
  groupId: z.string().optional(),
});
const failureSchema = z.object({
  retryAt: z.number(),
  message: z.string(),
  code: z.string().optional(),
  method: z.string().optional(),
  at: z.string().optional(),
});
const safeFailure = (error: unknown) => {
  if (
    error instanceof HttpError &&
    error.code === "VK_COMMUNITY_ALBUM_REQUIRED"
  )
    return { code: error.code, message: error.message };
  const auth = photoAuthDiagnostic(error);
  if (auth === "IP_MISMATCH")
    return {
      code: auth,
      message:
        "VK привязал доступ к другому IP. Нужно переподключить фотографии через сервер.",
    };
  if (error instanceof VkApiError)
    return {
      code: `VK_${error.code}`,
      ...([
        "photos.getWallUploadServer",
        "photos.saveWallPhoto",
        "photos.upload",
      ].includes(error.method ?? "")
        ? { method: error.method! }
        : {}),
      message:
        error.code === 5
          ? "VK отклонил доступ на этапе загрузки фото (код 5). Переподключите фотографии."
          : [15, 27].includes(error.code)
            ? `VK не разрешил загрузить или сохранить фото (код ${error.code}). Проверяется доступ администратора сообщества.`
            : `VK вернул ошибку при подготовке фото (код ${error.code}). Сервис повторит загрузку.`,
    };
  if (error instanceof VkPhotoUploadEmptyError)
    return {
      code: "VK_PHOTO_UPLOAD_EMPTY",
      message:
        "VK не вернул загруженное фото. Сервис повторит загрузку автоматически.",
    };
  return {
    code: "PHOTO_PREPARATION_FAILED",
    message:
      "Не удалось прочитать изображение или завершить его загрузку. Сервис повторит попытку автоматически.",
  };
};
export type PreparationImage = { id: string; objectId: string };
export const preparationKey = (groupId: string, image: PreparationImage) =>
  `vk.prepared.v1.${groupId}.${createHash("sha256")
    .update(JSON.stringify([image.id, image.objectId]))
    .digest("hex")}`;

// Separate from the post: editing the selected images cannot leave a stale
// attachment list, and the same immutable media object can be reused safely.
export const createVkPhotoPreparation = (options: {
  database: Database;
  groupId: string;
  upload: (imageId: string) => Promise<string>;
  keyPrefix?: string;
  requireCommunityOwner?: boolean;
}) => {
  const keyFor = (image: PreparationImage) =>
    `${options.keyPrefix ?? ""}${preparationKey(options.groupId, image)}`;
  const settings = () => options.database.client.appSetting;
  const inFlight = new Map<string, Promise<string>>();
  const read = async (image: PreparationImage) => {
    const row = await settings().findUnique({
      where: { key: keyFor(image) },
    });
    const ready = readySchema.safeParse(row?.value).data ?? null;
    return ready &&
      (communityAttachment(ready.attachment, options.groupId) ||
        (!options.requireCommunityOwner &&
          ready.kind === "wall" &&
          ready.groupId === options.groupId &&
          !ready.attachment.startsWith("photo-")))
      ? ready
      : null;
  };
  const prepare = (image: PreparationImage): Promise<string> => {
    const key = keyFor(image);
    const existing = inFlight.get(key);
    if (existing) return existing;
    const operation = (async () => {
      const ready = await read(image);
      if (ready) return ready.attachment;
      const lockKey = `${key}.lease`;
      const lease = randomUUID();
      // Survives restarts, bounds recovery after a crashed worker. This exceeds
      // all bounded upload attempts; no lease is held while posting to a wall.
      await settings().deleteMany({
        where: {
          key: lockKey,
          updatedAt: { lt: new Date(Date.now() - 10 * 60_000) },
        },
      });
      try {
        await settings().create({ data: { key: lockKey, value: { lease } } });
      } catch (error) {
        if ((error as { code?: string }).code !== "P2002") throw error;
        throw new HttpError(
          409,
          "VK_PHOTOS_PREPARING",
          "Фотографии ещё загружаются в VK. Повторите через минуту.",
        );
      }
      try {
        const completed = await read(image);
        if (completed) return completed.attachment;
        const attachment = attachmentSchema.parse(
          await options.upload(image.id),
        );
        if (
          options.requireCommunityOwner &&
          !communityAttachment(attachment, options.groupId)
        )
          throw new HttpError(
            409,
            "VK_COMMUNITY_ALBUM_REQUIRED",
            "Для отправки ключом сообщества нужно сохранить фото в альбом группы.",
          );
        const value = {
          attachment,
          preparedAt: new Date().toISOString(),
          kind: "wall",
          groupId: options.groupId,
        };
        await settings().upsert({
          where: { key },
          create: { key, value },
          update: { value },
        });
        await settings().deleteMany({ where: { key: `${key}.failure` } });
        return attachment;
      } catch (error) {
        // Never persist provider messages, tokens, upload URLs or access keys
        // in diagnostics. A partial batch keeps successfully prepared photos.
        const value = {
          retryAt: Date.now() + 60_000,
          ...safeFailure(error),
          at: new Date().toISOString(),
        };
        await settings().upsert({
          where: { key: `${key}.failure` },
          create: { key: `${key}.failure`, value },
          update: { value },
        });
        throw error;
      } finally {
        await settings().deleteMany({
          where: { key: lockKey, value: { equals: { lease } } },
        });
      }
    })().finally(() => {
      inFlight.delete(key);
    });
    inFlight.set(key, operation);
    return operation;
  };
  const inspect = async (image: PreparationImage) => {
    if (await read(image))
      return {
        ready: true,
        retryAt: 0,
        error: null,
        code: null,
        method: null,
        at: null,
      };
    const row = await settings().findUnique({
      where: { key: `${keyFor(image)}.failure` },
    });
    const failure = failureSchema.safeParse(row?.value).data;
    return {
      ready: false,
      retryAt: failure?.retryAt ?? 0,
      error: failure?.message ?? null,
      code: failure?.code ?? null,
      method: failure?.method ?? null,
      at: failure?.at ?? null,
    };
  };
  return { read, prepare, inspect };
};
