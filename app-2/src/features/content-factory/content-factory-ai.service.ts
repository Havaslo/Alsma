import type { Logger } from "pino";
import { z } from "zod";

import type { Database } from "../../lib/database/database.js";
import { HttpError } from "../../lib/http/http-error.js";
import type { ManagedStorage } from "../../lib/storage/managed-storage.js";
import {
  contentFactoryChannelGuidelines,
  contentFactoryModels,
} from "./content-factory-guidelines.js";
import { createContentFactoryImageGenerationService } from "./content-factory-image-generation.service.js";
import {
  assertReferencePhoto,
  buildContentFactoryChannelPromptContext,
} from "./content-factory-image-processing.js";
import { createContentFactoryTextRefinementService } from "./content-factory-text-refinement.service.js";
import type { ContentPlanPostInput } from "./content-plan.schemas.js";

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

const generatedPlanCopySchema = z.object({
  title: z.string().trim().min(1).max(255),
  text: z.string().trim().min(1).max(20_000),
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
      | "content_factory_plan_generation"
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
    readonly imageCount: number;
    readonly prompt: string;
    readonly size: string;
  }): Promise<unknown> => {
    if (!apiKey || !baseUrl) throw gatewayUnavailableError();
    const form = new FormData();
    form.set("model", contentFactoryModels.image);
    form.set("n", String(input.imageCount));
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

  const imageGeneration = createContentFactoryImageGenerationService({
    database: options.database,
    logger: options.logger,
    managedStorage: options.managedStorage,
    requestImageEdit,
  });

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

    generatePlanCopy: async (input: ContentPlanPostInput) => {
      const channelGuideline = contentFactoryChannelGuidelines.find(
        (guideline) => guideline.id === input.channel,
      );
      if (!channelGuideline) {
        throw new HttpError(
          400,
          "CONTENT_PLAN_CHANNEL_UNSUPPORTED",
          "Для этой площадки пока нет редакционного профиля.",
        );
      }
      const payload = await requestJson(
        "/chat/completions",
        {
          model: contentFactoryModels.text,
          max_tokens: 1_800,
          response_format: { type: "json_object" },
          temperature: 0.55,
          messages: [
            {
              role: "system",
              content: `Ты — редактор SMM загородного отеля ALSMA. Подготовь один готовый к редакторской проверке пост на русском языке. Верни только JSON: {"title": string, "text": string}. Соблюдай стиль выбранной площадки. Не выдумывай цены, скидки, сроки, наличие мест, адреса, услуги, ссылки, отзывы и условия. Используй только факты из брифа; если их не хватает, сформулируй нейтрально и не превращай неизвестное в обещание. Текст промта для изображения и рекомендацию исходного фото используй только как визуальные указания, не копируй их как факты в пост. Не заявляй, что пост одобрен или опубликован. Площадка: ${channelGuideline.label}. Редакторский профиль: ${channelGuideline.copy}`,
            },
            {
              role: "user",
              content: JSON.stringify({
                type: input.postType,
                format: input.format,
                topic: input.topic,
                audience: input.audience,
                confirmedFactsAndConditions: input.keyFacts,
                callToAction: input.callToAction,
                styleAndRestrictions: input.styleGuidance,
                imagePrompt: input.imagePrompt,
                sourceImageRecommendation: input.sourceImageRecommendation,
              }),
            },
          ],
        },
        "content_factory_plan_generation",
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
          "CONTENT_PLAN_AI_RESPONSE_INVALID",
          "AI-сервис вернул ответ без текста. Повторите генерацию этого поста.",
        );
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch {
        throw new HttpError(
          502,
          "CONTENT_PLAN_AI_RESPONSE_INVALID",
          "AI-сервис вернул ответ в неподдерживаемом формате. Повторите генерацию этого поста.",
        );
      }
      const result = generatedPlanCopySchema.safeParse(parsed);
      if (!result.success) {
        options.logger.warn(
          { validationIssueCount: result.error.issues.length },
          "Content plan AI response did not match the expected format",
        );
        throw new HttpError(
          502,
          "CONTENT_PLAN_AI_RESPONSE_INVALID",
          "AI-сервис подготовил пост в неожиданном формате. Повторите генерацию.",
        );
      }
      return { ...result.data, model: contentFactoryModels.text };
    },

    generateImage: imageGeneration.generateImage,
  };
};
