import type { Database } from "../../lib/database/database.js";
import type {
  KnowledgeArticleBody,
  KnowledgeRuleBody,
} from "./knowledge-base.schemas.js";

export const createKnowledgeBaseRepository = (database: Database) => ({
  createArticle: (input: KnowledgeArticleBody) =>
    database.client.knowledgeArticle.create({
      data: {
        category: input.category,
        channels: input.channels,
        content: input.content,
        publishedAt: input.status === "published" ? new Date() : null,
        slug: input.slug,
        status: input.status,
        summary: input.summary,
        tags: input.tags,
        title: input.title,
      },
    }),
  createRule: (input: KnowledgeRuleBody) =>
    database.client.agentRule.create({
      data: {
        channels: input.channels,
        content: input.content,
        enabled: input.enabled,
        priority: input.priority,
        title: input.title,
      },
    }),
  listArticles: () =>
    database.client.knowledgeArticle.findMany({
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { chunks: true } } },
    }),
  listLogs: () =>
    database.client.knowledgeQueryLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  listPublishedChunks: () =>
    database.client.knowledgeChunk.findMany({
      include: { article: true },
      where: { article: { status: "published" } },
    }),
  listRules: () =>
    database.client.agentRule.findMany({
      orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
    }),
  logQuery: (
    channel: "text" | "voice",
    query: string,
    answer: string,
    sourceIds: string[],
    status: "answered" | "no_answer",
  ) =>
    database.client.knowledgeQueryLog.create({
      data: { answer, channel, query, sources: sourceIds, status },
    }),
  publishArticle: (articleId: string) =>
    database.client.knowledgeArticle.update({
      data: { publishedAt: new Date(), status: "published" },
      where: { id: articleId },
    }),
  replaceChunks: (articleId: string, chunks: string[]) =>
    database.client.$transaction([
      database.client.knowledgeChunk.deleteMany({ where: { articleId } }),
      database.client.knowledgeChunk.createMany({
        data: chunks.map((content, chunkIndex) => ({
          articleId,
          chunkIndex,
          content,
        })),
      }),
    ]),
  updateArticle: (input: KnowledgeArticleBody & { id: string }) =>
    database.client.knowledgeArticle.update({
      data: {
        category: input.category,
        channels: input.channels,
        content: input.content,
        publishedAt: input.status === "published" ? new Date() : undefined,
        slug: input.slug,
        status: input.status,
        summary: input.summary,
        tags: input.tags,
        title: input.title,
      },
      where: { id: input.id },
    }),
  updateRule: (input: KnowledgeRuleBody & { id: string }) =>
    database.client.agentRule.update({
      data: {
        channels: input.channels,
        content: input.content,
        enabled: input.enabled,
        priority: input.priority,
        title: input.title,
      },
      where: { id: input.id },
    }),
});

export type KnowledgeBaseRepository = ReturnType<
  typeof createKnowledgeBaseRepository
>;
