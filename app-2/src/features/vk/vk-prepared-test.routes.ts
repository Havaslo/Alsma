import { Router } from "express";
import type { Logger } from "pino";
import { z } from "zod";

import type { Database } from "../../lib/database/database.js";
import { HttpError } from "../../lib/http/http-error.js";
import type { ManagedStorage } from "../../lib/storage/managed-storage.js";
import { createVkPhotoPreparation } from "../content-factory/vk-photo-preparation.js";
import { prepareVkPhoto } from "./vk-photo-image.js";
import { validateTestUploadUrl } from "./vk-test-photo-upload.js";
import { VkApiError, createVkClient } from "./vk.client.js";

const groupId = "138003065";
const inputSchema = z
  .object({
    testId: z.uuid(),
    text: z.string().trim().min(1).max(2000),
    imageIds: z.array(z.uuid()).min(1).max(2),
  })
  .strict();
const idSchema = z.object({ testId: z.uuid() }).strict();
const savedSchema = inputSchema.extend({
  attachments: z.array(z.string()).min(1).max(2),
});
const receiptSchema = z.object({ postId: z.string(), url: z.string() });
const keyFor = (id: string) => `vk.prepared.test.${groupId}.${id}`;
const limit = 10 * 1024 * 1024;

// Mounted behind the existing admin/permission middleware. Target is fixed:
// caller input can never select the production community.
export const createVkPreparedTestRouter = (options: {
  database: Database;
  storage: ManagedStorage;
  logger: Logger;
  getPhotoToken: () => Promise<string | undefined>;
  allowPublishing: boolean;
}): Router => {
  const router = Router();
  const settings = () => options.database.client.appSetting;
  router.post("/prepare", async (request, response) => {
    const parsed = inputSchema.safeParse(request.body);
    if (!parsed.success)
      throw new HttpError(400, "INVALID_TEST", "Неверные параметры теста.");
    const input = parsed.data;
    const key = keyFor(input.testId);
    const existing = await settings().findUnique({ where: { key } });
    if (existing) {
      const saved = savedSchema.parse(existing.value);
      if (
        saved.text !== input.text ||
        JSON.stringify(saved.imageIds) !== JSON.stringify(input.imageIds)
      )
        throw new HttpError(
          409,
          "TEST_ALREADY_PREPARED",
          "Для другого теста нужен новый ID.",
        );
      response.json({ prepared: true, images: saved.attachments.length });
      return;
    }
    const token = process.env.VK_BLACK_TURTLE_TEST_TOKEN?.trim();
    if (!token)
      throw new HttpError(
        409,
        "TEST_TOKEN_MISSING",
        "Нет ключа тестового сообщества.",
      );
    const photoToken = await options.getPhotoToken();
    if (!photoToken)
      throw new HttpError(
        409,
        "PHOTO_TOKEN_MISSING",
        "Обновите доступ к фотографиям.",
      );
    const vk = createVkClient({
      accessToken: token,
      photoUploadAccessToken: photoToken,
      logger: options.logger,
      validatePhotoUploadUrl: (url) => Boolean(validateTestUploadUrl(url)),
    });
    await vk.verifyCredentials(groupId);
    const media = await options.database.client.contentFactoryMedia.findMany({
      where: { id: { in: input.imageIds } },
    });
    const byId = new Map(media.map((image) => [image.id, image]));
    const preparation = createVkPhotoPreparation({
      database: options.database,
      groupId,
      upload: async (id) => {
        const image = byId.get(id)!;
        if (
          !image ||
          !["image/jpeg", "image/png", "image/webp"].includes(
            image.contentType,
          ) ||
          image.sizeBytes > limit
        )
          throw new HttpError(
            400,
            "INVALID_PHOTO",
            "Изображение не подходит для теста.",
          );
        const download = await options.storage.getDownload(image.objectId);
        const remote = await fetch(download.downloadUrl, {
          signal: AbortSignal.timeout(30000),
        });
        if (!remote.ok) throw new Error("Test image unavailable");
        const content = new Uint8Array(await remote.arrayBuffer());
        if (!content.length || content.length > limit)
          throw new Error("Test image too large");
        let attachments: readonly string[] = [];
        await vk.publishWallPost({
          groupId,
          idempotencyKey: `prepare-test-${id}`,
          prepareOnly: true,
          onPreparedAttachments: (values) => {
            attachments = values;
          },
          text: input.text,
          images: [
            await prepareVkPhoto({
              content,
              fileName: image.fileName,
              contentType: image.contentType,
            }),
          ],
        });
        if (attachments.length !== 1)
          throw new Error("Test attachment missing");
        return attachments[0]!;
      },
    });
    const attachments: string[] = [];
    for (const id of input.imageIds) {
      const image = byId.get(id);
      if (!image)
        throw new HttpError(400, "PHOTO_NOT_FOUND", "Фотография не найдена.");
      attachments.push(await preparation.prepare(image));
    }
    // An immutable snapshot permits delivery in a separate request/process.
    await settings().create({
      data: { key, value: { ...input, attachments } },
    });
    response.json({ prepared: true, images: attachments.length });
  });
  router.post("/publish", async (request, response) => {
    if (!options.allowPublishing)
      throw new HttpError(
        403,
        "PREPARATION_ONLY",
        "В этой среде разрешена только подготовка.",
      );
    const parsed = idSchema.safeParse(request.body);
    if (!parsed.success)
      throw new HttpError(400, "INVALID_TEST", "Неверный ID теста.");
    const key = keyFor(parsed.data.testId);
    const receiptKey = `${key}.receipt`;
    const receipt = await settings().findUnique({ where: { key: receiptKey } });
    if (receipt) {
      const saved = receiptSchema.safeParse(receipt.value);
      if (!saved.success)
        throw new HttpError(
          409,
          "CHECK_TEST_WALL",
          "Исход предыдущей отправки неизвестен. Проверьте стену тестовой группы.",
        );
      response.json(saved.data);
      return;
    }
    const row = await settings().findUnique({ where: { key } });
    const saved = savedSchema.safeParse(row?.value);
    if (!saved.success)
      throw new HttpError(
        409,
        "TEST_NOT_PREPARED",
        "Сначала подготовьте фотографии.",
      );
    const token = process.env.VK_BLACK_TURTLE_TEST_TOKEN?.trim();
    if (!token)
      throw new HttpError(
        409,
        "TEST_TOKEN_MISSING",
        "Нет ключа тестового сообщества.",
      );
    // Claim before wall.post. After an uncertain result, never send a duplicate.
    try {
      await settings().create({
        data: {
          key: receiptKey,
          value: { startedAt: new Date().toISOString() },
        },
      });
    } catch (error) {
      if ((error as { code?: string }).code === "P2002")
        throw new HttpError(
          409,
          "CHECK_TEST_WALL",
          "Отправка уже началась. Проверьте тестовую группу.",
        );
      throw error;
    }
    try {
      const client = createVkClient({
        accessToken: token,
        logger: options.logger,
        getPhotoUploadAccessToken: async () => {
          throw new Error("Photo token must not be used for prepared delivery");
        },
      });
      const result = await client.publishPreparedWallPost({
        groupId,
        idempotencyKey: `prepared-test-${parsed.data.testId}`,
        attachments: saved.data.attachments,
        text: saved.data.text,
      });
      const value = { postId: result.externalId, url: result.url };
      await settings().update({ where: { key: receiptKey }, data: { value } });
      response.json(value);
    } catch (error) {
      if (error instanceof VkApiError && error.code !== 10)
        await settings().deleteMany({ where: { key: receiptKey } });
      throw error;
    }
  });
  return router;
};
