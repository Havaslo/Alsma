import type { Logger } from "pino";

import type { Database } from "../../lib/database/database.js";
import { HttpError } from "../../lib/http/http-error.js";
import type { ManagedStorage } from "../../lib/storage/managed-storage.js";
import {
  type ContentFactoryChannelId,
  contentFactoryModels,
  getContentFactoryChannelGuideline,
} from "./content-factory-guidelines.js";
import {
  assertReferencePhoto,
  cropGeneratedImage,
} from "./content-factory-image-processing.js";
import { createContentFactoryRepository } from "./content-factory.repository.js";

const generatedImageMaxBytes = 20 * 1_024 * 1_024;

const getStorageFileName = (fileName: string) =>
  fileName.replace(/[\\/]/g, "_").replace(/[^\x20-\x7E]/g, "_") || "image";

const cleanupGeneratedMedia = async (
  media: Array<{ readonly id: string; readonly objectId: string }>,
  dependencies: {
    readonly database: Database;
    readonly logger: Logger;
    readonly managedStorage: ManagedStorage;
  },
) => {
  const repository = createContentFactoryRepository(dependencies.database);
  await Promise.all(
    media.map(async (item) => {
      await repository.deleteMedia(item.id).catch((error: unknown) => {
        dependencies.logger.warn(
          {
            errorName: error instanceof Error ? error.name : "UnknownError",
          },
          "Generated content factory media metadata cleanup failed",
        );
      });
      await dependencies.managedStorage
        .deleteObject(item.objectId)
        .catch((error: unknown) => {
          dependencies.logger.warn(
            {
              errorName: error instanceof Error ? error.name : "UnknownError",
            },
            "Generated content factory media cleanup failed",
          );
        });
    }),
  );
};

export const createContentFactoryImageGenerationService = (options: {
  readonly database: Database;
  readonly logger: Logger;
  readonly managedStorage: ManagedStorage;
  readonly requestImageEdit: (input: {
    readonly content: Buffer;
    readonly contentType: string;
    readonly fileName: string;
    readonly prompt: string;
    readonly size: string;
  }) => Promise<unknown>;
}) => ({
  generateImage: async (input: {
    readonly adminId: string;
    readonly postText: string;
    readonly prompt: string;
    readonly selectedChannels: readonly ContentFactoryChannelId[];
    readonly sourceTitle: string;
    readonly sourceCategory: string;
    readonly sourceTags: readonly string[];
    readonly referencePhoto: unknown;
    readonly referencePhotoContentType: string;
  }) => {
    const referencePhoto = assertReferencePhoto(
      input.referencePhoto,
      input.referencePhotoContentType,
    );
    const targetsByDimensions = new Map<
      string,
      {
        channels: ContentFactoryChannelId[];
        height: number;
        ratio: string;
        width: number;
      }
    >();
    for (const channelId of input.selectedChannels) {
      const channel = getContentFactoryChannelGuideline(channelId);
      const { outputHeight: height, outputWidth: width, ratio } = channel.image;
      const key = `${width}x${height}`;
      const target = targetsByDimensions.get(key) ?? {
        channels: [],
        height,
        ratio,
        width,
      };
      target.channels.push(channelId);
      targetsByDimensions.set(key, target);
    }
    const cropTargets = [...targetsByDimensions.values()];
    const targetDescriptions = cropTargets
      .map(
        (target) =>
          `${target.ratio} (${target.width} × ${target.height} px) для ${target.channels
            .map(
              (channelId) => getContentFactoryChannelGuideline(channelId).label,
            )
            .join(", ")}`,
      )
      .join("; ");
    const imagePrompt = [
      "Создай одно универсальное фотореалистичное мастер-изображение для публикации. Это один общий визуал, не отдельные варианты для каналов.",
      `Смысл текста публикации: ${input.postText}`,
      `Дополнительные пожелания пользователя: ${input.prompt.trim() || "не заданы; ориентируйся на смысл публикации"}`,
      `Исходное фото: «${input.sourceTitle}», раздел «${input.sourceCategory}», теги: ${input.sourceTags.join(", ") || "нет"}. Используй переданное фото как обязательную визуальную основу, а не только как вдохновение. Согласуй настроение и сцену с содержанием поста, не превращая текст поста в надписи на изображении.`,
      `После одной генерации изображение будет обрезано до форматов: ${targetDescriptions}.`,
      "Сохрани узнаваемую планировку, архитектуру, мебель, предметы, людей и другие видимые элементы оригинала. Не выдумывай факты и не добавляй объекты, услуги, оборудование, детали интерьера или пейзажа, которых нет на фото. Разрешены аккуратные изменения освещения, цветового баланса и фотографической композиции.",
      "Оставь главный объект и важные детали в центральной безопасной области, чтобы они сохранились при всех перечисленных кадрировках. Не добавляй текст, буквы, логотипы, водяные знаки, рамки или коллаж.",
    ].join("\n\n");
    const payload = await options.requestImageEdit({
      content: referencePhoto,
      contentType: input.referencePhotoContentType,
      fileName: `${input.sourceTitle}.jpg`,
      prompt: imagePrompt,
      size: "1536x1024",
    });
    const root =
      typeof payload === "object" && payload
        ? (payload as Record<string, unknown>)
        : null;
    const data = Array.isArray(root?.data) ? root.data[0] : null;
    const imageBase64 =
      typeof data === "object" && data
        ? (data as Record<string, unknown>).b64_json
        : null;
    if (typeof imageBase64 !== "string" || !imageBase64.trim()) {
      throw new HttpError(
        502,
        "CONTENT_FACTORY_AI_IMAGE_INVALID",
        "AI-сервис не вернул изображение. Попробуйте другой запрос.",
      );
    }

    const rawContent = Buffer.from(imageBase64, "base64");
    if (
      rawContent.length === 0 ||
      rawContent.length > generatedImageMaxBytes ||
      !rawContent
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    ) {
      throw new HttpError(
        502,
        "CONTENT_FACTORY_AI_IMAGE_INVALID",
        "AI-сервис вернул повреждённый файл изображения.",
      );
    }

    const repository = createContentFactoryRepository(options.database);
    const createdMedia: Array<{
      readonly id: string;
      readonly objectId: string;
    }> = [];
    const generatedTargets: Array<{
      channels: ContentFactoryChannelId[];
      media: Awaited<ReturnType<typeof repository.createMedia>>;
    }> = [];
    try {
      for (const target of cropTargets) {
        const content = await cropGeneratedImage(rawContent, {
          width: target.width,
          height: target.height,
        });
        const fileName = `AI · ${target.ratio} · ${input.sourceTitle}`
          .slice(0, 251)
          .concat(".png");
        let stored: { readonly objectId: string };
        try {
          stored = await options.managedStorage.upload({
            content: Uint8Array.from(content),
            contentType: "image/png",
            name: getStorageFileName(fileName),
          });
        } catch (error) {
          options.logger.error(
            { errorName: error instanceof Error ? error.name : "UnknownError" },
            "Generated content factory image could not be stored",
          );
          throw new HttpError(
            502,
            "CONTENT_FACTORY_AI_IMAGE_STORAGE_FAILED",
            "Изображение создано, но не удалось сохранить его в медиатеке. Повторите позже.",
          );
        }

        try {
          const media = await repository.createMedia({
            adminId: input.adminId,
            contentType: "image/png",
            fileName,
            objectId: stored.objectId,
            sizeBytes: content.length,
          });
          createdMedia.push({ id: media.id, objectId: stored.objectId });
          generatedTargets.push({ channels: target.channels, media });
        } catch (error) {
          await options.managedStorage
            .deleteObject(stored.objectId)
            .catch((cleanupError: unknown) => {
              options.logger.warn(
                {
                  errorName:
                    cleanupError instanceof Error
                      ? cleanupError.name
                      : "UnknownError",
                },
                "Orphaned generated content factory image cleanup failed",
              );
            });
          throw error;
        }
      }
    } catch (error) {
      await cleanupGeneratedMedia(createdMedia, options);
      throw error;
    }

    return {
      assets: generatedTargets,
      model: contentFactoryModels.image,
    };
  },
});
