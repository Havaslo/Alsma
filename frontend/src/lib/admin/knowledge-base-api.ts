import { readAdminSession } from "@/lib/admin/admin-session";
import { apiClient } from "@/lib/api/api-client";

export type KnowledgeArticle = {
  readonly _count: { chunks: number };
  readonly content: string;
  readonly createdAt: string;
  readonly id: string;
  readonly publishedAt: string | null;
  readonly status: "archived" | "draft" | "published";
  readonly title: string;
  readonly updatedAt: string;
};
export type KnowledgeRule = {
  readonly content: string;
  readonly enabled: boolean;
  readonly id: string;
  readonly priority: number;
  readonly title: string;
  readonly updatedAt: string;
};
export type KnowledgeLog = {
  readonly answer: string | null;
  readonly createdAt: string;
  readonly id: string;
  readonly query: string;
  readonly sources: string[];
};
export type KnowledgePageData = {
  readonly articles: KnowledgeArticle[];
  readonly logs: KnowledgeLog[];
  readonly rules: KnowledgeRule[];
};
export type KnowledgeArticleInput = Pick<
  KnowledgeArticle,
  "content" | "status" | "title"
> & { readonly id?: string };
export type KnowledgeRuleInput = Pick<
  KnowledgeRule,
  "content" | "enabled" | "priority" | "title"
> & { readonly id?: string };

const headers = () => ({ Authorization: `Bearer ${readAdminSession() ?? ""}` });

export const loadKnowledgeBase = (signal?: AbortSignal) =>
  apiClient.get<KnowledgePageData>("/admin/knowledge-base", {
    headers: headers(),
    signal,
  });
export const saveKnowledgeArticle = (input: KnowledgeArticleInput) =>
  apiClient.post<{ article: KnowledgeArticle }>(
    "/admin/knowledge-base/articles",
    input,
    { headers: headers() },
  );
export const publishKnowledgeArticle = (articleId: string) =>
  apiClient.post<{ article: KnowledgeArticle }>(
    `/admin/knowledge-base/articles/${articleId}/publish`,
    undefined,
    { headers: headers() },
  );
export const saveKnowledgeRule = (input: KnowledgeRuleInput) =>
  apiClient.post<{ rule: KnowledgeRule }>(
    "/admin/knowledge-base/rules",
    input,
    { headers: headers() },
  );
export const testKnowledgeAnswer = (input: {
  channel: "text" | "voice";
  question: string;
}) =>
  apiClient.post<{
    answer: string;
    sources: Array<{
      articleId: string;
      articleTitle: string;
      content: string;
      score: number;
    }>;
    status: "answered" | "no_answer";
  }>("/admin/knowledge-base/answer", input, { headers: headers() });
