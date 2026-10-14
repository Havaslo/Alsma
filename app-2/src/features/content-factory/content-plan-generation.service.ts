import type { Logger } from "pino";

import type { Database } from "../../lib/database/database.js";
import { HttpError } from "../../lib/http/http-error.js";
import type { ManagedStorage } from "../../lib/storage/managed-storage.js";
import type { ContentFactoryAiService } from "./content-factory-ai.service.js";
import { assertReferencePhoto } from "./content-factory-image-processing.js";
import { createContentPlanRepository } from "./content-plan.repository.js";
import type {
  ContentPlanImportBody,
  ManualContentPlanPost,
} from "./content-plan.schemas.js";

const stalePostMilliseconds = 10 * 60 * 1_000;
const maxConcurrentGenerations = 2;

const generationErrorMessage = (error: unknown) =>
  error instanceof HttpError
    ? error.message
    : "Не удалось создать текст. Можно повторить генерацию этого поста.";

const imageGenerationErrorMessage = (error: unknown) =>
  error instanceof HttpError
    ? error.message
    : "Не удалось подготовить изображение. Его можно заменить или создать в окне проверки.";

export const createContentPlanGenerationService = (options: {
  readonly ai: Pick<
    ContentFactoryAiService,
    "generateImage" | "generatePlanCopy"
  >;
  readonly database: Database;
  readonly logger: Logger;
  readonly managedStorage: ManagedStorage;
  readonly fetchImplementation?: typeof fetch;
}) => {
  const repository = createContentPlanRepository(options.database);
  const fetchImplementation = options.fetchImplementation ?? fetch;
  const queue: string[] = [];
  const queuedIds = new Set<string>();
  const activeIds = new Set<string>();

  const generatePlanImage = async (input: {
    readonly adminId: string;
    readonly imagePrompt: string;
    readonly imageSourceMode: "edit" | "generate" | "library";
    readonly postText: string;
    readonly sourceImageRecommendation: string;
    readonly channel: string;
  }) => {
    const sourceMedia =
      input.imageSourceMode === "generate"
        ? null
        : await repository.findMediaByExactFileName(
            input.sourceImageRecommendation.trim(),
          );
    if (sourceMedia && sourceMedia.length !== 1) {
      throw new HttpError(
        400,
        "CONTENT_PLAN_IMAGE_SOURCE_NOT_FOUND",
        sourceMedia.length === 0
          ? `В медиатеке не найден файл «${input.sourceImageRecommendation}». Укажите точное имя файла или выберите другое действие для изображения.`
          : `В медиатеке найдено несколько файлов «${input.sourceImageRecommendation}». Уточните имя файла.`,
      );
    }
    const media = sourceMedia?.[0];
    if (input.imageSourceMode === "library") {
      if (!media) {
        throw new HttpError(
          400,
          "CONTENT_PLAN_IMAGE_SOURCE_NOT_FOUND",
          "Укажите точное имя файла из медиатеки для изображения поста.",
        );
      }
      return { imageIds: [media.id], imageStatus: "completed" as const };
    }

    const referencePhotos: Array<{
      readonly content: Buffer;
      readonly contentType: string;
      readonly sourceCategory: string;
      readonly sourceTags: readonly string[];
      readonly sourceTitle: string;
    }> = [];
    if (input.imageSourceMode === "edit" && media) {
      const download = await options.managedStorage.getDownload(media.objectId);
      const response = await fetchImplementation(download.downloadUrl);
      if (!response.ok) {
        throw new Error("Не удалось загрузить исходное фото из медиатеки.");
      }
      const content = Buffer.from(await response.arrayBuffer());
      assertReferencePhoto(content, media.contentType);
      referencePhotos.push({
        content,
        contentType: media.contentType,
        sourceCategory: "Медиатека",
        sourceTags: [],
        sourceTitle: media.fileName,
      });
    }

    const result = await options.ai.generateImage({
      adminId: input.adminId,
      imageCount: 1,
      mode: input.imageSourceMode === "edit" ? "edit" : "generate",
      postText: input.postText,
      prompt: input.imagePrompt,
      selectedChannels: [
        input.channel as ContentPlanImportBody["posts"][number]["channel"],
      ],
      referencePhotos,
    });
    const asset = result.assets.find((item) =>
      item.channels.includes(
        input.channel as ContentPlanImportBody["posts"][number]["channel"],
      ),
    );
    if (!asset) {
      throw new HttpError(
        502,
        "CONTENT_PLAN_IMAGE_GENERATION_INVALID",
        "ИИ не вернул изображение для выбранной площадки.",
      );
    }
    return { imageIds: [asset.media.id], imageStatus: "completed" as const };
  };

  const runPost = async (postId: string) => {
    const claim = await repository.claimPost(postId);
    if (claim.count === 0) return;
    const post = await repository.findPostForGeneration(postId);
    if (!post) return;
    try {
      const result = await options.ai.generatePlanCopy({
        sourceRow: post.sourceRow,
        date: post.scheduledDate.toISOString().slice(0, 10),
        time: post.scheduledTime,
        postType: post.postType,
        channel:
          post.channel as ContentPlanImportBody["posts"][number]["channel"],
        format: post.format,
        topic: post.topic,
        audience: post.audience,
        keyFacts: post.keyFacts,
        callToAction: post.callToAction,
        styleGuidance: post.styleGuidance,
        imagePrompt: post.imagePrompt,
        imageSourceMode:
          post.imageSourceMode as ContentPlanImportBody["posts"][number]["imageSourceMode"],
        sourceImageRecommendation: post.sourceImageRecommendation,
      });

      let imageResult: {
        readonly imageIds: readonly string[];
        readonly imageStatus: "completed" | "failed";
        readonly imageError: string | null;
      };
      try {
        await repository.updateImageGenerationState(postId, {
          status: "processing",
        });
        const image = await generatePlanImage({
          adminId: post.createdById ?? "",
          channel: post.channel,
          imagePrompt: post.imagePrompt,
          imageSourceMode: post.imageSourceMode as
            "edit" | "generate" | "library",
          postText: `${result.title}\n\n${result.text}`,
          sourceImageRecommendation: post.sourceImageRecommendation,
        });
        imageResult = { ...image, imageError: null };
      } catch (error) {
        options.logger.warn(
          {
            errorName: error instanceof Error ? error.name : "UnknownError",
            postId,
          },
          "Content plan image generation failed",
        );
        imageResult = {
          imageError: imageGenerationErrorMessage(error),
          imageIds: [],
          imageStatus: "failed",
        };
      }
      await repository.completeGeneration(postId, {
        title: result.title,
        copy: result.text,
        ...imageResult,
      });
    } catch (error) {
      options.logger.warn(
        {
          errorName: error instanceof Error ? error.name : "UnknownError",
          postId,
        },
        "Content plan post generation failed",
      );
      await repository
        .failGeneration(postId, generationErrorMessage(error))
        .catch((updateError: unknown) => {
          options.logger.error(
            {
              errorName:
                updateError instanceof Error
                  ? updateError.name
                  : "UnknownError",
              postId,
            },
            "Content plan generation failure could not be saved",
          );
        });
    }
  };

  const drainQueue = () => {
    while (activeIds.size < maxConcurrentGenerations && queue.length > 0) {
      const postId = queue.shift();
      if (!postId) continue;
      queuedIds.delete(postId);
      if (activeIds.has(postId)) continue;
      activeIds.add(postId);
      void runPost(postId)
        .catch((error: unknown) => {
          options.logger.error(
            {
              errorName: error instanceof Error ? error.name : "UnknownError",
              postId,
            },
            "Content plan post worker crashed",
          );
        })
        .finally(() => {
          activeIds.delete(postId);
          drainQueue();
        });
    }
  };

  const schedule = (postId: string) => {
    if (queuedIds.has(postId) || activeIds.has(postId)) return;
    queuedIds.add(postId);
    queue.push(postId);
    drainQueue();
  };

  const submit = async (adminId: string, input: ContentPlanImportBody) => {
    const contentPlanImport = await repository.createImport(
      adminId,
      input.fileName,
      input.posts,
    );
    for (const post of contentPlanImport.posts) schedule(post.id);
    return {
      importId: contentPlanImport.id,
      postCount: contentPlanImport.posts.length,
    };
  };

  const submitManual = async (
    adminId: string,
    input: ManualContentPlanPost,
  ) => {
    const manualImport = await repository.createManualPosts(adminId, input);
    return { importId: manualImport.id, postCount: manualImport.posts.length };
  };

  const resumeQueuedPosts = async () => {
    await repository.requeueStalePosts(
      new Date(Date.now() - stalePostMilliseconds),
    );
    const queued = await repository.listQueuedPostIds();
    for (const post of queued) schedule(post.id);
  };

  const retry = async (postId: string) => {
    const result = await repository.retryPost(postId);
    if (result.count === 0) {
      const post = await repository.findPostForGeneration(postId);
      if (!post) {
        throw new HttpError(
          404,
          "CONTENT_PLAN_POST_NOT_FOUND",
          "Публикация не найдена. Обновите календарь.",
        );
      }
      throw new HttpError(
        409,
        "CONTENT_PLAN_POST_NOT_RETRYABLE",
        "Повторить можно только пост с ошибкой генерации.",
      );
    }
    schedule(postId);
  };

  return { resumeQueuedPosts, retry, submit, submitManual };
};

export type ContentPlanGenerationService = ReturnType<
  typeof createContentPlanGenerationService
>;
