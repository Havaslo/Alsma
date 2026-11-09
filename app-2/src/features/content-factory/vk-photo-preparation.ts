import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";

import type { Database } from "../../lib/database/database.js";
import { HttpError } from "../../lib/http/http-error.js";

const attachmentSchema = z
  .string()
  .regex(/^photo-?\d+_\d+(?:_[a-zA-Z0-9_-]+)?$/u);
const readySchema = z.object({
  attachment: attachmentSchema,
  preparedAt: z.string(),
});
const failureSchema = z.object({ retryAt: z.number(), message: z.string() });
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
}) => {
  const settings = () => options.database.client.appSetting;
  const inFlight = new Map<string, Promise<string>>();
  const read = async (image: PreparationImage) => {
    const row = await settings().findUnique({
      where: { key: preparationKey(options.groupId, image) },
    });
    return readySchema.safeParse(row?.value).data ?? null;
  };
  const prepare = (image: PreparationImage): Promise<string> => {
    const key = preparationKey(options.groupId, image);
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
        const value = { attachment, preparedAt: new Date().toISOString() };
        await settings().upsert({
          where: { key },
          create: { key, value },
          update: { value },
        });
        return attachment;
      } catch (error) {
        // Never persist provider messages, tokens, upload URLs or access keys
        // in diagnostics. A partial batch keeps successfully prepared photos.
        const value = {
          retryAt: Date.now() + 60_000,
          message:
            "Не удалось подготовить фото. Проверьте доступ VK и повторите.",
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
    if (await read(image)) return { ready: true, retryAt: 0, error: null };
    const row = await settings().findUnique({
      where: { key: `${preparationKey(options.groupId, image)}.failure` },
    });
    const failure = failureSchema.safeParse(row?.value).data;
    return {
      ready: false,
      retryAt: failure?.retryAt ?? 0,
      error: failure?.message ?? null,
    };
  };
  return { read, prepare, inspect };
};
