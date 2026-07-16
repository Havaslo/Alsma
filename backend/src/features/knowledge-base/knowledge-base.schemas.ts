import { z } from "zod";

export const knowledgeArticleBodySchema = z.object({
  content: z.string().trim().min(1).max(30_000),
  id: z.uuid().optional(),
  status: z.enum(["archived", "draft", "published"]).default("draft"),
  title: z.string().trim().min(1).max(255),
});

export const knowledgeRuleBodySchema = z.object({
  content: z.string().trim().min(1).max(4_000),
  enabled: z.boolean().default(true),
  id: z.uuid().optional(),
  priority: z.number().int().min(0).max(9_999).default(100),
  title: z.string().trim().min(1).max(255),
});

export const knowledgeAnswerBodySchema = z.object({
  channel: z.enum(["text", "voice"]).default("text"),
  question: z.string().trim().min(1).max(4_000),
});

export const knowledgeArticleParamsSchema = z.object({ articleId: z.uuid() });

export type KnowledgeArticleBody = z.infer<typeof knowledgeArticleBodySchema>;
export type KnowledgeRuleBody = z.infer<typeof knowledgeRuleBodySchema>;
export type KnowledgeAnswerBody = z.infer<typeof knowledgeAnswerBodySchema>;
export type KnowledgeArticleParams = z.infer<
  typeof knowledgeArticleParamsSchema
>;
