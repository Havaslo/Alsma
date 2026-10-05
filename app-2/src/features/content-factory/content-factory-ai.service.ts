import type { Logger } from "pino";
import { z } from "zod";

import type { Database } from "../../lib/database/database.js";
import { HttpError } from "../../lib/http/http-error.js";
import type { ManagedStorage } from "../../lib/storage/managed-storage.js";
import {
  contentFactoryModels,
  getContentFactoryChannelGuideline,
} from "./content-factory-guidelines.js";
import {
  assertReferencePhoto,
  buildContentFactoryChannelPromptContext,
  cropGeneratedImage,
} from "./content-factory-image-processing.js";
import { createContentFactoryTextRefinementService } from "./content-factory-text-refinement.service.js";
import { createContentFactoryRepository } from "./content-factory.repository.js";

const imagePromptMaxLength = 2_000;
const generatedImageMaxBytes = 20 * 1_024 * 1_024;

const generatedAdaptationsSchema = z.object({
  vk: z.string().trim().min(1).max(20_000),
  telegram: z.string().trim().min(1).max(20_000),
  max: z.string().trim().min(1).max(20_000),
  instagram: z.string().trim().min(1).max(20_000),
  zen: z.string().trim().min(1).max(20_000),
});

const generatedTextSchema = z.object({
  variants: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(255),
        concept: z.string().trim().min(1).max(4_000),
        text: z.string().trim().min(1).max(20_000),
        adaptations: generatedAdaptationsSchema,
      }),
    )
    .length(3),
});

type GatewayFailure = {
  readonly code?: string;
  readonly requestId?: string;
  readonly stage?: string;
};

const readGatewayFailure = (
  value: unknown,
  response: Response,
): GatewayFailure => {
  if (typeof value !== "object" || !value) {
    return {
      requestId:
        response.headers.get("x-request-id") ??
        response.headers.get("openai-request-id") ??
        undefined,
    };
  }
  const root = value as Record<string, unknown>;
  const error =
    typeof root.error === "object" && root.error
      ? (root.error as Record<string, unknown>)
      : root;
  return {
    code: typeof error.code === "string" ? error.code.slice(0, 120) : undefined,
    requestId:
      (typeof error.requestId === "string" && error.requestId.slice(0, 160)) ||
      response.headers.get("x-request-id") ||
      response.headers.get("openai-request-id") ||
      undefined,
    stage:
      typeof error.stage === "string" ? error.stage.slice(0, 120) : undefined,
  };
};

const readJson = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const getStorageFileName = (fileName: string) =>
  fileName.replace(/[\\/]/g, "_").replace(/[^\x20-\x7E]/g, "_") || "image";

const gatewayUnavailableError = () =>
  new HttpError(
    503,
    "CONTENT_FACTORY_AI_UNAVAILABLE",
    "AI-шлюз пока не настроен для Фабрики контента. Обратитесь к администратору проекта.",
  );

export type ContentFactoryAiService = ReturnType<
  typeof createContentFactoryAiService
>;

export const createContentFactoryAiService = (options: {
  readonly apiKey?: string;
  readonly baseUrl?: string;
  readonly database: Database;
  readonly fetchImplementation?: typeof fetch;
  readonly logger: Logger;
  readonly managedStorage: ManagedStorage;
}) => {
  const apiKey = options.apiKey;
  const baseUrl = options.baseUrl?.replace(/\/+$/u, "");
  const fetchImplementation = options.fetchImplementation ?? fetch;

  const requestJson = async (
    path: string,
    body: unknown,
    stage:
      | "content_factory_text"
      | "content_factory_text_refinement"
      | "content_factory_image",
  ): Promise<unknown> => {
    if (!apiKey || !baseUrl) throw gatewayUnavailableError();
    let response: Response;
    try {
      response = await fetchImplementation(`${baseUrl}${path}`, {
        body: JSON.stringify(body),
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        signal: AbortSignal.timeout(90_000),
      });
    } catch (error) {
      options.logger.warn(
        {
          errorName: error instanceof Error ? error.name : "UnknownError",
          gatewayStage: stage,
        },
        "Content factory AI Gateway request could not be completed",
      );
      throw new HttpError(
        503,
        "CONTENT_FACTORY_AI_TIMEOUT",
        "AI-сервис не ответил вовремя. Повторите запрос немного позже.",
      );
    }

    const payload = await readJson(response);
    if (!response.ok) {
      const failure = readGatewayFailure(payload, response);
      options.logger.warn(
        {
          gatewayCode: failure.code,
          gatewayRequestId: failure.requestId,
          gatewayStage: failure.stage ?? stage,
          gatewayStatus: response.status,
        },
        "Content factory AI Gateway request failed",
      );
      throw new HttpError(
        response.status === 429 ? 503 : 502,
        "CONTENT_FACTORY_AI_REQUEST_FAILED",
        response.status === 429
          ? "AI-сервис временно занят. Повторите запрос немного позже."
          : "AI-сервис не смог выполнить запрос. Проверьте описание и попробуйте ещё раз.",
        {
          gatewayCode: failure.code,
          requestId: failure.requestId,
          stage: failure.stage ?? stage,
        },
      );
    }
    return payload;
  };

  const requestImageEdit = async (input: {
    readonly content: Buffer;
    readonly contentType: string;
    readonly fileName: string;
    readonly prompt: string;
    readonly size: string;
  }): Promise<unknown> => {
    if (!apiKey || !baseUrl) throw gatewayUnavailableError();
    const form = new FormData();
    form.set("model", contentFactoryModels.image);
    form.set("n", "1");
    form.set("output_format", "png");
    form.set("prompt", input.prompt);
    form.set("quality", "medium");
    form.set("size", input.size);
    form.set(
      "image",
      new Blob([Uint8Array.from(input.content)], { type: input.contentType }),
      getStorageFileName(input.fileName),
    );

    let response: Response;
    try {
      response = await fetchImplementation(`${baseUrl}/images/edits`, {
        body: form,
        headers: { Authorization: `Bearer ${apiKey}` },
        method: "POST",
        signal: AbortSignal.timeout(180_000),
      });
    } catch (error) {
      options.logger.warn(
        {
          errorName: error instanceof Error ? error.name : "UnknownError",
          gatewayStage: "content_factory_image",
        },
        "Content factory AI Gateway image edit could not be completed",
      );
      throw new HttpError(
        503,
        "CONTENT_FACTORY_AI_TIMEOUT",
        "AI-сервис не ответил вовремя. Повторите запрос немного позже.",
      );
    }

    const payload = await readJson(response);
    if (!response.ok) {
      const failure = readGatewayFailure(payload, response);
      options.logger.warn(
        {
          gatewayCode: failure.code,
          gatewayRequestId: failure.requestId,
          gatewayStage: failure.stage ?? "content_factory_image",
          gatewayStatus: response.status,
        },
        "Content factory AI Gateway image edit failed",
      );
      throw new HttpError(
        response.status === 429 ? 503 : 502,
        "CONTENT_FACTORY_AI_REQUEST_FAILED",
        response.status === 429
          ? "AI-сервис временно занят. Повторите запрос немного позже."
          : "AI-сервис не смог обработать выбранное фото. Проверьте промт и попробуйте ещё раз.",
        {
          gatewayCode: failure.code,
          requestId: failure.requestId,
          stage: failure.stage ?? "content_factory_image",
        },
      );
    }
    return payload;
  };

  return {
    refineText: createContentFactoryTextRefinementService(requestJson),
    generateText: async (input: {
      readonly prompt: string;
      readonly selectedChannels: readonly string[];
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
      const channelContext = buildContentFactoryChannelPromptContext();
      const payload = await requestJson(
        "/chat/completions",
        {
          model: contentFactoryModels.text,
          max_tokens: 3_500,
          response_format: { type: "json_object" },
          temperature: 0.7,
          messages: [
            {
              role: "system",
              content: `Ты — редактор контента загородного отеля ALSMA. Отвечай только JSON-объектом вида {"variants":[{"title":string,"concept":string,"text":string,"adaptations":{"vk":string,"telegram":string,"max":string,"instagram":string,"zen":string}}]}. Создай ровно три разных варианта на русском языке. В основной текст включи выбранные площадки; для всех пяти подготовь самостоятельные адаптации. Учитывай правила площадок из контекста ниже; рекомендации по формату изображения не выдавай за гарантию отображения. Если brief просит карусель, включай только подходящие ей каналы и не утверждай, что альбом или вложения являются одинаковой native-каруселью везде. Используй фото как фактический визуальный ориентир: опирайся на то, что действительно видно, не придумывай не показанные услуги и свойства места. Метаданные фото и его пиксели помогают понять тему, но факты о цене, сроках, акциях, адресах и доступности бери только из задачи и утверждённых данных. Не выдумывай ссылки и обещания; если фактов недостаточно, выбери нейтральную формулировку и отметь это в концепции. Это только черновики для человека: ничего не публикуй и не сообщай, будто материал уже отправлен.\n\nПрофили каналов: ${JSON.stringify(channelContext)}`,
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    task: input.prompt,
                    selectedChannels: input.selectedChannels,
                    referencePhoto: {
                      title: input.sourceTitle,
                      category: input.sourceCategory,
                      tags: input.sourceTags,
                      instruction:
                        "Сверь текст с фактическим содержимым фото; не считай название и теги доказательством скрытых свойств.",
                    },
                  }),
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${input.referencePhotoContentType};base64,${referencePhoto.toString("base64")}`,
                  },
                },
              ],
            },
          ],
        },
        "content_factory_text",
      );

      const root =
        typeof payload === "object" && payload
          ? (payload as Record<string, unknown>)
          : null;
      const choices = Array.isArray(root?.choices) ? root.choices : [];
      const message =
        choices[0] && typeof choices[0] === "object"
          ? (choices[0] as Record<string, unknown>).message
          : null;
      const content =
        typeof message === "object" && message
          ? (message as Record<string, unknown>).content
          : null;
      if (typeof content !== "string") {
        throw new HttpError(
          502,
          "CONTENT_FACTORY_AI_RESPONSE_INVALID",
          "AI-сервис вернул ответ без текста. Повторите запрос.",
        );
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch {
        throw new HttpError(
          502,
          "CONTENT_FACTORY_AI_RESPONSE_INVALID",
          "AI-сервис вернул ответ в неподдерживаемом формате. Повторите запрос.",
        );
      }
      const result = generatedTextSchema.safeParse(parsed);
      if (!result.success) {
        options.logger.warn(
          { validationIssueCount: result.error.issues.length },
          "Content factory AI response did not match the expected format",
        );
        throw new HttpError(
          502,
          "CONTENT_FACTORY_AI_RESPONSE_INVALID",
          "AI-сервис подготовил варианты в неожиданном формате. Повторите запрос.",
        );
      }
      return {
        model: contentFactoryModels.text,
        variants: result.data.variants,
      };
    },

    generateImage: async (input: {
      readonly adminId: string;
      readonly prompt: string;
      readonly channel: string;
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
      const channel = getContentFactoryChannelGuideline(input.channel);
      const prompt = [
        `Задача пользователя: ${input.prompt}`,
        `Выбранное исходное фото: «${input.sourceTitle}», раздел «${input.sourceCategory}», теги: ${input.sourceTags.join(", ") || "нет"}. Используй переданное фото как обязательную визуальную основу, а не только как вдохновение.`,
        `Канал назначения: ${channel.label}. Целевой кадр: ${channel.image.dimensions}, соотношение ${channel.image.ratio}, формат хранения PNG. Это визуальная рекомендация; готовый кадр будет обрезан до указанного соотношения.`,
        `Правила площадки: ${channel.image.note} ${channel.gallery}`,
        "Сохрани узнаваемую планировку, архитектуру, мебель, предметы, людей и другие видимые элементы оригинала. Не добавляй и не удаляй объекты, услуги, оборудование, детали интерьера или пейзажа, которых нет на фото. Разрешены аккуратные изменения освещения, цветового баланса и фотографической композиции.",
        "Фотореалистичная редактура, естественные цвета, чистая композиция. Оставь главный объект и важные детали в центральной безопасной области кадра, чтобы они пережили обрезку. Не добавляй текст, буквы, логотипы, водяные знаки, рамки или коллаж. За один запрос создаётся один кадр, даже если канал поддерживает альбом или карусель.",
      ].join("\n\n");
      const payload = await requestImageEdit({
        content: referencePhoto,
        contentType: input.referencePhotoContentType,
        fileName: `${input.sourceTitle}.jpg`,
        prompt,
        size: channel.image.apiSize,
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

      const content = await cropGeneratedImage(rawContent, {
        width: channel.image.outputWidth,
        height: channel.image.outputHeight,
      });

      const fileName = `ai-${input.channel}-${new Date().toISOString().replace(/[:.]/gu, "-")}.png`;
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
        const repository = createContentFactoryRepository(options.database);
        return await repository.createMedia({
          adminId: input.adminId,
          contentType: "image/png",
          fileName: `AI · ${channel.label} · ${input.sourceTitle}.png`,
          objectId: stored.objectId,
          sizeBytes: content.length,
        });
      } catch (error) {
        await options.managedStorage
          .deleteObject(stored.objectId)
          .catch((cleanupError) => {
            options.logger.warn(
              {
                cleanupErrorName:
                  cleanupError instanceof Error
                    ? cleanupError.name
                    : "UnknownError",
              },
              "Orphaned generated content factory image cleanup failed",
            );
          });
        throw error;
      }
    },
  };
};

export const contentFactoryImageGenerationLimits = {
  maxPromptLength: imagePromptMaxLength,
} as const;
