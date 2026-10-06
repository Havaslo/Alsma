import type { Logger } from "pino";

import type { Database } from "../../lib/database/database.js";
import { HttpError } from "../../lib/http/http-error.js";
import type { ContentFactoryAiService } from "./content-factory-ai.service.js";
import { createContentPlanRepository } from "./content-plan.repository.js";
import type {
  ContentPlanImportBody,
  ManualContentPlanPost,
} from "./content-plan.schemas.js";

const stalePostMilliseconds = 5 * 60 * 1_000;
const maxConcurrentGenerations = 2;

const generationErrorMessage = (error: unknown) =>
  error instanceof HttpError
    ? error.message
    : "Не удалось создать текст. Можно повторить генерацию этого поста.";

export const createContentPlanGenerationService = (options: {
  readonly ai: Pick<ContentFactoryAiService, "generatePlanCopy">;
  readonly database: Database;
  readonly logger: Logger;
}) => {
  const repository = createContentPlanRepository(options.database);
  const queue: string[] = [];
  const queuedIds = new Set<string>();
  const activeIds = new Set<string>();

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
        sourceImageRecommendation: post.sourceImageRecommendation,
      });
      await repository.completeGeneration(postId, {
        title: result.title,
        copy: result.text,
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
