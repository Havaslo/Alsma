import type { Logger } from "pino";

import type { Database } from "../../lib/database/database.js";
import { HttpError } from "../../lib/http/http-error.js";
import type { ManagedStorage } from "../../lib/storage/managed-storage.js";
import {
  type ContentFactoryChannelId,
  contentFactoryModels,
  getContentFactoryChannelGuideline,
} from "./content-factory-guidelines.js";
import { addAlsmaLogo } from "./content-factory-image-branding.js";
import {
  assertReferencePhoto,
  composeOutpaintedImage,
  createPortraitOutpaintingCanvas,
  cropGeneratedImageToRatio,
  fitGeneratedImageWithoutCropping,
} from "./content-factory-image-processing.js";
import { createContentFactoryRepository } from "./content-factory.repository.js";

const generatedImageMaxBytes = 20 * 1_024 * 1_024;

const getStorageFileName = (fileName: string) =>
  fileName.replace(/[\\/]/g, "_").replace(/[^\x20-\x7E]/g, "_") || "image";

const parseGeneratedImages = (payload: unknown, expectedCount: number) => {
  const root =
    typeof payload === "object" && payload
      ? (payload as Record<string, unknown>)
      : null;
  const data = Array.isArray(root?.data) ? root.data : [];
  const images = data.map((item) =>
    typeof item === "object" && item
      ? (item as Record<string, unknown>).b64_json
      : null,
  );
  if (
    images.length !== expectedCount ||
    images.some((image) => typeof image !== "string" || !image.trim())
  ) {
    throw new HttpError(
      502,
      "CONTENT_FACTORY_AI_IMAGE_INVALID",
      "AI-сервис вернул не все запрошенные изображения. Попробуйте ещё раз.",
    );
  }

  return images.map((imageBase64) => {
    const content = Buffer.from(imageBase64 as string, "base64");
    if (
      content.length === 0 ||
      content.length > generatedImageMaxBytes ||
      !content
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    ) {
      throw new HttpError(
        502,
        "CONTENT_FACTORY_AI_IMAGE_INVALID",
        "AI-сервис вернул повреждённый файл изображения.",
      );
    }
    return content;
  });
};

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
  readonly requestImage: (input: {
    readonly images: readonly {
      readonly content: Buffer;
      readonly contentType: string;
      readonly fileName: string;
    }[];
    readonly imageCount: number;
    readonly mask?: Buffer;
    readonly prompt: string;
    readonly size: string;
  }) => Promise<unknown>;
}) => ({
  generateImage: async (input: {
    readonly adminId: string;
    readonly imageCount: number;
    readonly mode: "edit" | "generate";
    readonly postText: string;
    readonly prompt: string;
    readonly selectedChannels: readonly ContentFactoryChannelId[];
    readonly referencePhotos: readonly {
      readonly content: Buffer;
      readonly contentType: string;
      readonly sourceCategory: string;
      readonly sourceTags: readonly string[];
      readonly sourceTitle: string;
    }[];
  }) => {
    const sourcePhotos = input.referencePhotos.map((photo) => ({
      ...photo,
      content: assertReferencePhoto(photo.content, photo.contentType),
    }));
    if (input.mode === "edit" && sourcePhotos.length === 0) {
      throw new HttpError(
        400,
        "CONTENT_FACTORY_REFERENCE_PHOTO_REQUIRED",
        "Для редактирования выберите хотя бы одно исходное фото.",
      );
    }
    const targetsByDimensions = new Map<
      string,
      {
        channels: ContentFactoryChannelId[];
        height: number;
        apiSize: string;
        ratio: string;
        width: number;
      }
    >();
    for (const channelId of input.selectedChannels) {
      const channel = getContentFactoryChannelGuideline(channelId);
      const {
        apiSize,
        outputHeight: height,
        outputWidth: width,
        ratio,
      } = channel.image;
      const key = `${width}x${height}`;
      const target = targetsByDimensions.get(key) ?? {
        apiSize,
        channels: [],
        height,
        ratio,
        width,
      };
      target.channels.push(channelId);
      targetsByDimensions.set(key, target);
    }
    const targets = [...targetsByDimensions.values()];
    const sourceDescription = sourcePhotos.length
      ? sourcePhotos
          .map(
            (photo, index) =>
              `${index + 1}. «${photo.sourceTitle}», раздел «${photo.sourceCategory}», теги: ${photo.sourceTags.join(", ") || "нет"}`,
          )
          .join("\n")
      : "Исходные фото не приложены; создай изображение с нуля по тексту и инструкции пользователя.";
    const promptContext = [
      `Смысл текста публикации: ${input.postText}`,
      `Дополнительные пожелания пользователя: ${input.prompt.trim() || "не заданы; ориентируйся на смысл публикации"}`,
      input.mode === "edit"
        ? `Используй фото пользователя как визуальные референсы, сохраняя их узнаваемые элементы. Описания исходных материалов:\n${sourceDescription}`
        : sourceDescription,
      "Явные пожелания пользователя к сцене приоритетны. Не меняй без прямой просьбы архитектуру, отделку, оборудование и инфраструктуру объекта; не изображай неподтверждённые факты, цены, акции или услуги как действительные.",
    ];
    const headlineInstructions =
      "Добавь одну короткую, крупную и хорошо читаемую надпись на грамотном русском языке: самостоятельно сформулируй её по смыслу публикации; если пожелания пользователя содержат точную фразу, воспроизведи её без изменений. Не копируй весь пост и не придумывай неподтверждённые цены, даты, скидки, свойства или обещания. Не более двух строк. Оставь сверху безопасное пустое поле не менее 18% высоты кадра и по бокам не менее 12%; не размещай символы вплотную к краям. Если фраза не помещается, перенеси её на вторую строку. Оставь нижний левый угол свободным для логотипа. Не генерируй логотипы, водяные знаки, рамки или коллаж — логотип «Алсмы» будет добавлен отдельно.";
    const squarePrompt = [
      `Создай ${input.imageCount} самостоятельных квадратных фотореалистичных изображений для одной публикации. Каждый результат — отдельный кадр, а не коллаж, сетка или несколько сцен внутри изображения.`,
      "Создай единый основной квадратный кадр 1:1, 1024 × 1024 px. Он станет исходником для всех форматов: помести важные объекты и надпись внутрь квадрата и не привязывай композицию к узкому вертикальному или широкому горизонтальному кадру.",
      ...promptContext,
      headlineInstructions,
    ].join("\n\n");
    const portraitOutpaintPrompt = [
      "Это дорисовка (outpainting) готового квадратного изображения до вертикального формата 4:5. Маска отмечает области, которые нужно создать заново: дострой туда естественное продолжение той же сцены, фона, освещения и цветовой гаммы. Не оставляй размытую подложку, пустые полосы или однотонные края.",
      "Квадрат в центре — готовая исходная часть изображения. Не меняй её содержание и композицию; особенно не перерисовывай, не переписывай и не добавляй текст. Продолжи сцену только в областях маски, сохрани плавный переход у границ исходного квадрата. Не добавляй второй логотип, водяной знак или новую надпись.",
      `Публикация: ${input.postText}\nПожелания: ${input.prompt.trim() || "нет"}`,
    ].join("\n\n");
    const landscapePrompt = (target: (typeof targets)[number]) =>
      [
        "Создай новый горизонтальный вариант исходного квадратного кадра для широкой обложки. Используй переданный квадрат как главный визуальный референс: сохрани ту же сцену, предметы, стиль, освещение и палитру, но естественно перестрой композицию для всего горизонтального кадра; не растягивай квадрат и не добавляй размытые боковые полосы.",
        `Формат: горизонтальный ${target.ratio}, итоговый кадр ${target.width} × ${target.height} px для площадки ${target.channels.map((channelId) => getContentFactoryChannelGuideline(channelId).label).join(", ")}.`,
        ...promptContext,
        "Если в исходном квадрате есть заголовок, воспроизведи ту же фразу без изменений, не придумывай другой текст. Оставь надпись целиком внутри кадра, сверху — безопасное поле не менее 25% высоты, по бокам — не менее 12%. Оставь нижний левый угол свободным для фирменного логотипа. Логотип, рамки и водяные знаки не генерируй.",
      ].join("\n\n");
    const referenceImages = sourcePhotos.map((photo, index) => ({
      content: photo.content,
      contentType: photo.contentType,
      fileName: `${photo.sourceTitle || `source-${index + 1}`}.jpg`,
    }));
    const baseImages = parseGeneratedImages(
      await options.requestImage({
        images: referenceImages,
        imageCount: input.imageCount,
        prompt: squarePrompt,
        size: "1024x1024",
      }),
      input.imageCount,
    );
    const rawImagesByTarget = new Map<string, Buffer[]>();
    for (const target of targets) {
      const images: Buffer[] = [];
      if (target.ratio === "1:1") {
        images.push(...baseImages);
      } else if (target.ratio === "4:5") {
        for (const baseImage of baseImages) {
          const outpaintCanvas =
            await createPortraitOutpaintingCanvas(baseImage);
          const payload = await options.requestImage({
            images: [
              {
                content: outpaintCanvas.image,
                contentType: "image/png",
                fileName: "square-image-with-portrait-extensions.png",
              },
            ],
            imageCount: 1,
            mask: outpaintCanvas.mask,
            prompt: portraitOutpaintPrompt,
            size: "1024x1536",
          });
          const [outpainted] = parseGeneratedImages(payload, 1);
          if (!outpainted) {
            throw new HttpError(
              502,
              "CONTENT_FACTORY_AI_IMAGE_INVALID",
              "AI-сервис не вернул вертикальную дорисовку. Попробуйте ещё раз.",
            );
          }
          images.push(
            await composeOutpaintedImage(
              outpainted,
              baseImage,
              { width: target.width, height: target.height },
              outpaintCanvas,
            ),
          );
        }
      } else {
        for (const baseImage of baseImages) {
          const payload = await options.requestImage({
            images: [
              {
                content: baseImage,
                contentType: "image/png",
                fileName: "square-image-for-landscape-variation.png",
              },
            ],
            imageCount: 1,
            prompt: landscapePrompt(target),
            size: target.apiSize,
          });
          const [landscapeImage] = parseGeneratedImages(payload, 1);
          if (!landscapeImage) {
            throw new HttpError(
              502,
              "CONTENT_FACTORY_AI_IMAGE_INVALID",
              "AI-сервис не вернул горизонтальный вариант. Попробуйте ещё раз.",
            );
          }
          images.push(
            await cropGeneratedImageToRatio(landscapeImage, {
              width: target.width,
              height: target.height,
            }),
          );
        }
      }
      rawImagesByTarget.set(`${target.width}x${target.height}`, images);
    }

    const repository = createContentFactoryRepository(options.database);
    const createdMedia: Array<{
      readonly id: string;
      readonly objectId: string;
    }> = [];
    const generatedTargets: Array<{
      channels: ContentFactoryChannelId[];
      media: Awaited<ReturnType<typeof repository.createMedia>>;
      setIndex: number;
    }> = [];
    try {
      for (let setIndex = 0; setIndex < input.imageCount; setIndex += 1) {
        for (const target of targets) {
          const rawContent = rawImagesByTarget.get(
            `${target.width}x${target.height}`,
          )?.[setIndex];
          if (!rawContent) {
            throw new HttpError(
              502,
              "CONTENT_FACTORY_AI_IMAGE_INVALID",
              "AI-сервис не вернул изображение нужного формата.",
            );
          }
          const fittedContent = await fitGeneratedImageWithoutCropping(
            rawContent,
            { width: target.width, height: target.height },
          );
          const content = await addAlsmaLogo(fittedContent);
          const fileName = `AI · ${setIndex + 1} · ${target.ratio} · ${
            sourcePhotos.map((photo) => photo.sourceTitle).join(" + ") ||
            "Новый кадр"
          }`
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
              {
                errorName: error instanceof Error ? error.name : "UnknownError",
              },
              "Generated content factory image could not be stored",
            );
            throw new HttpError(
              502,
              "CONTENT_FACTORY_AI_IMAGE_STORAGE_FAILED",
              "Изображения созданы, но не удалось сохранить их в медиатеке. Повторите позже.",
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
            generatedTargets.push({
              channels: target.channels,
              media,
              setIndex,
            });
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
