import type { RequestHandler } from "express";

import type {
  KnowledgeAnswerBody,
  KnowledgeArticleBody,
  KnowledgeArticleParams,
  KnowledgeRuleBody,
} from "./knowledge-base.schemas.js";
import type { KnowledgeBaseService } from "./knowledge-base.service.js";

export const createGetKnowledgeBaseHandler =
  (service: KnowledgeBaseService): RequestHandler =>
  async (_request, response) => {
    response.json(await service.getPageData());
  };

export const createSaveKnowledgeArticleHandler =
  (service: KnowledgeBaseService): RequestHandler =>
  async (_request, response) => {
    response.json({
      article: await service.saveArticle(
        response.locals.input.body as KnowledgeArticleBody,
      ),
    });
  };

export const createPublishKnowledgeArticleHandler =
  (service: KnowledgeBaseService): RequestHandler =>
  async (_request, response) => {
    const { articleId } = response.locals.input
      .params as KnowledgeArticleParams;
    response.json({ article: await service.publishArticle(articleId) });
  };

export const createSaveKnowledgeRuleHandler =
  (service: KnowledgeBaseService): RequestHandler =>
  async (_request, response) => {
    response.json({
      rule: await service.saveRule(
        response.locals.input.body as KnowledgeRuleBody,
      ),
    });
  };

export const createAnswerKnowledgeHandler =
  (service: KnowledgeBaseService): RequestHandler =>
  async (_request, response) => {
    response.json(
      await service.answer(response.locals.input.body as KnowledgeAnswerBody),
    );
  };
