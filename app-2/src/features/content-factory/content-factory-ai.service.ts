import type { Logger } from "pino";
import { z } from "zod";

import type { Database } from "../../lib/database/database.js";
import { HttpError } from "../../lib/http/http-error.js";
import type { ManagedStorage } from "../../lib/storage/managed-storage.js";
import { createContentFactoryRepository } from "./content-factory.repository.js";

const textModel = "gpt-4.1-mini";
const imageModel = "gpt-image-1-mini";
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
    stage: "content_factory_text" | "content_factory_image",
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

  return {
    generateText: async (input: {
      readonly prompt: string;
      readonly selectedChannels: readonly string[];
    }) => {
      const payload = await requestJson(
        "/chat/completions",
        {
          model: textModel,
          max_tokens: 3_500,
          response_format: { type: "json_object" },
          temperature: 0.7,
          messages: [
            {
              role: "system",
              content:
                'Ты редактор контента для загородного отеля ALSMA. Отвечай только JSON-объектом вида {"variants":[{"title":string,"concept":string,"text":string,"adaptations":{"vk":string,"telegram":string,"max":string,"instagram":string,"zen":string}}]}. Создай ровно три отличающихся по подаче варианта на русском языке. Для каждого подготовь самостоятельную адаптацию для каждой из перечисленных площадок: VK, Telegram, MAX, Instagram и Яндекс.Дзен; если площадка не выбрана, всё равно сформируй черновой вариант. Не выдумывай цены, сроки, скидки, условия, адреса, доступность услуг или ссылки: используй только факты из задачи. Если фактов недостаточно, сформулируй текст без неподтверждённых обещаний и отметь осторожность в концепции. Это только черновики для проверки человеком, ничего не публикуй и не заявляй, что публикация отправлена.',
            },
            {
              role: "user",
              content: JSON.stringify({
                task: input.prompt,
                selectedChannels: input.selectedChannels,
              }),
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
      return { model: textModel, variants: result.data.variants };
    },

    generateImage: async (input: {
      readonly adminId: string;
      readonly prompt: string;
    }) => {
      const payload = await requestJson(
        "/images/generations",
        {
          model: imageModel,
          n: 1,
          output_format: "png",
          prompt: input.prompt,
          quality: "low",
          size: "1024x1024",
        },
        "content_factory_image",
      );
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

      const content = Buffer.from(imageBase64, "base64");
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

      const fileName = `ai-image-${new Date().toISOString().replace(/[:.]/gu, "-")}.png`;
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
          fileName: "Изображение, созданное ИИ.png",
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
