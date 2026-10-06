import type { RequestHandler } from "express";

import type { Database } from "../../lib/database/database.js";
import { HttpError } from "../../lib/http/http-error.js";
import { parseContentPlanFile } from "./content-plan-file-parser.js";
import type { ContentPlanGenerationService } from "./content-plan-generation.service.js";
import { createContentPlanRepository } from "./content-plan.repository.js";

export const contentPlanUploadLimit = "10mb";

const serializePost = (post: {
  readonly id: string;
  readonly importId: string;
  readonly sourceRow: number;
  readonly scheduledDate: Date;
  readonly scheduledTime: string;
  readonly postType: string;
  readonly channel: string;
  readonly format: string;
  readonly topic: string;
  readonly audience: string;
  readonly keyFacts: string;
  readonly callToAction: string;
  readonly styleGuidance: string;
  readonly imagePrompt: string;
  readonly sourceImageRecommendation: string;
  readonly generatedTitle: string;
  readonly generatedCopy: string;
  readonly status: string;
  readonly generationError: string | null;
  readonly approvedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly import?: { readonly fileName: string } | null;
}) => ({
  id: post.id,
  importId: post.importId,
  sourceRow: post.sourceRow,
  date: post.scheduledDate.toISOString().slice(0, 10),
  time: post.scheduledTime,
  postType: post.postType,
  channel: post.channel,
  format: post.format,
  topic: post.topic,
  audience: post.audience,
  keyFacts: post.keyFacts,
  callToAction: post.callToAction,
  styleGuidance: post.styleGuidance,
  imagePrompt: post.imagePrompt,
  sourceImageRecommendation: post.sourceImageRecommendation,
  title: post.generatedTitle || post.topic,
  text: post.generatedCopy,
  status: post.status,
  generationError: post.generationError,
  approvedAt: post.approvedAt,
  createdAt: post.createdAt,
  updatedAt: post.updatedAt,
  import: post.import,
});

export const createPreviewContentPlanHandler: RequestHandler = async (
  request,
  response,
) => {
  const { fileName } = response.locals.input.query;
  if (!Buffer.isBuffer(request.body) || request.body.length === 0) {
    throw new HttpError(
      400,
      "CONTENT_PLAN_FILE_EMPTY",
      "Выберите заполненный файл XLSX.",
    );
  }
  if (request.body.length > 10 * 1_024 * 1_024) {
    throw new HttpError(
      413,
      "CONTENT_PLAN_FILE_TOO_LARGE",
      "Размер таблицы не должен превышать 10 МБ.",
    );
  }
  const posts = parseContentPlanFile(request.body, fileName);
  response.json({ fileName, posts });
};

export const createGenerateContentPlanHandler =
  (service: ContentPlanGenerationService): RequestHandler =>
  async (_request, response) => {
    const result = await service.submit(
      response.locals.admin.id,
      response.locals.input.body,
    );
    response.status(202).json({ ...result, status: "queued" });
  };

export const createCreateManualContentPlanPostsHandler =
  (service: ContentPlanGenerationService): RequestHandler =>
  async (_request, response) => {
    const result = await service.submitManual(
      response.locals.admin.id,
      response.locals.input.body,
    );
    response.status(201).json(result);
  };

export const createListContentPlanPostsHandler =
  (database: Database, service: ContentPlanGenerationService): RequestHandler =>
  async (_request, response) => {
    await service.resumeQueuedPosts();
    const repository = createContentPlanRepository(database);
    response.json({
      items: (await repository.listPosts()).map(serializePost),
    });
  };

export const createUpdateContentPlanPostHandler =
  (database: Database): RequestHandler =>
  async (_request, response) => {
    const { postId } = response.locals.input.params;
    const repository = createContentPlanRepository(database);
    const post = await repository.updateReviewPost(
      postId,
      response.locals.input.body,
    );
    if (!post) {
      const existing = await repository.findPostForGeneration(postId);
      if (!existing) {
        throw new HttpError(
          404,
          "CONTENT_PLAN_POST_NOT_FOUND",
          "Публикация не найдена. Обновите календарь.",
        );
      }
      throw new HttpError(
        409,
        "CONTENT_PLAN_POST_NOT_REVIEWABLE",
        "Изменить этот пост можно после завершения генерации.",
      );
    }
    response.json({ post: serializePost(post) });
  };

export const createApproveContentPlanPostHandler =
  (database: Database): RequestHandler =>
  async (_request, response) => {
    const { postId } = response.locals.input.params;
    const repository = createContentPlanRepository(database);
    const post = await repository.approvePost(postId, response.locals.admin.id);
    if (!post) {
      const existing = await repository.findPostForGeneration(postId);
      if (!existing) {
        throw new HttpError(
          404,
          "CONTENT_PLAN_POST_NOT_FOUND",
          "Публикация не найдена. Обновите календарь.",
        );
      }
      throw new HttpError(
        409,
        "CONTENT_PLAN_POST_NOT_READY",
        "Пост можно одобрить только после завершения генерации и проверки.",
      );
    }
    response.json({ post: serializePost(post) });
  };

export const createCancelContentPlanPostHandler =
  (database: Database): RequestHandler =>
  async (_request, response) => {
    const { postId } = response.locals.input.params;
    const repository = createContentPlanRepository(database);
    const post = await repository.cancelPost(postId);
    if (!post) {
      throw new HttpError(
        404,
        "CONTENT_PLAN_POST_NOT_FOUND",
        "Публикация не найдена или уже отменена.",
      );
    }
    response.json({ post: serializePost(post) });
  };

export const createRetryContentPlanPostHandler =
  (service: ContentPlanGenerationService): RequestHandler =>
  async (_request, response) => {
    await service.retry(response.locals.input.params.postId);
    response.status(202).json({ status: "queued" });
  };
