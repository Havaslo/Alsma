import type { KnowledgeBaseRepository } from "./knowledge-base.repository.js";
import type {
  KnowledgeAnswerBody,
  KnowledgeArticleBody,
  KnowledgeRuleBody,
} from "./knowledge-base.schemas.js";

const stopWords = new Set([
  "и",
  "в",
  "на",
  "по",
  "с",
  "к",
  "из",
  "от",
  "до",
  "не",
  "ли",
  "а",
  "но",
  "или",
  "что",
  "как",
  "это",
  "для",
]);

const tokenize = (value: string) =>
  (value.toLocaleLowerCase("ru-RU").match(/[a-zа-яё0-9]+/giu) ?? []).filter(
    (token) => !stopWords.has(token),
  );

const chunkContent = (content: string, maxLength = 600) => {
  const paragraphs = content
    .split(/\n+/u)
    .map((item) => item.trim())
    .filter(Boolean);
  const chunks: string[] = [];
  let current = "";
  for (const paragraph of paragraphs) {
    if (current && current.length + paragraph.length + 1 > maxLength) {
      chunks.push(current);
      current = paragraph;
    } else {
      current = current ? `${current}\n${paragraph}` : paragraph;
    }
  }
  if (current) chunks.push(current);
  return chunks;
};

const scoreText = (question: string, content: string) => {
  const questionTokens = new Set(tokenize(question));
  const contentTokens = new Set(tokenize(content));
  if (!questionTokens.size) return 0;
  let matches = 0;
  for (const token of questionTokens) {
    if (contentTokens.has(token)) matches += 1;
  }
  return matches / questionTokens.size;
};

export const createKnowledgeBaseService = (
  repository: KnowledgeBaseRepository,
) => ({
  answer: async (input: KnowledgeAnswerBody) => {
    const chunks = await repository.listPublishedChunks();
    const matches = chunks
      .map((chunk) => ({
        chunk,
        score: scoreText(input.question, chunk.content),
      }))
      .filter(({ score }) => score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, 3);
    const answered = (matches[0]?.score ?? 0) >= 0.18;
    const answer = answered
      ? input.channel === "voice"
        ? matches
            .slice(0, 2)
            .map(({ chunk }) => chunk.content.split("\n")[0])
            .join(" ")
            .slice(0, 420)
        : matches.map(({ chunk }) => chunk.content).join("\n\n")
      : "Точной информации по этому вопросу в базе знаний сейчас нет. Передайте вопрос менеджеру, чтобы получить подтверждённый ответ.";
    const sources = [...new Set(matches.map(({ chunk }) => chunk.articleId))];
    await repository.logQuery(input.question, answer, sources);
    return {
      answer,
      status: answered ? "answered" : "no_answer",
      sources: matches.map(({ chunk, score }) => ({
        articleId: chunk.articleId,
        articleTitle: chunk.article.title,
        content: chunk.content,
        score: Number(score.toFixed(4)),
      })),
    };
  },
  getPageData: async () => ({
    articles: await repository.listArticles(),
    logs: await repository.listLogs(),
    rules: await repository.listRules(),
  }),
  publishArticle: async (articleId: string) => {
    const article = await repository.publishArticle(articleId);
    await repository.replaceChunks(article.id, chunkContent(article.content));
    return article;
  },
  saveArticle: async (input: KnowledgeArticleBody) => {
    const article = input.id
      ? await repository.updateArticle({ ...input, id: input.id })
      : await repository.createArticle(input);
    if (input.status === "published") {
      await repository.replaceChunks(article.id, chunkContent(article.content));
    }
    return article;
  },
  saveRule: (input: KnowledgeRuleBody) =>
    input.id
      ? repository.updateRule({ ...input, id: input.id })
      : repository.createRule(input),
});

export type KnowledgeBaseService = ReturnType<
  typeof createKnowledgeBaseService
>;
