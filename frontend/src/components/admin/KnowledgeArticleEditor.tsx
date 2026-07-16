import { useState } from "react";

import { Save, Send } from "lucide-react";

import type { KnowledgeArticle } from "@/lib/admin/knowledge-base-api";
import {
  usePublishKnowledgeArticle,
  useSaveKnowledgeArticle,
} from "@/lib/admin/useKnowledgeBase";

export const KnowledgeArticleEditor = ({
  article,
}: {
  readonly article?: KnowledgeArticle;
}) => {
  const [title, setTitle] = useState(article?.title ?? "");
  const [content, setContent] = useState(article?.content ?? "");
  const [status, setStatus] = useState<KnowledgeArticle["status"]>(
    article?.status ?? "draft",
  );
  const save = useSaveKnowledgeArticle();
  const publish = usePublishKnowledgeArticle();
  return (
    <form
      className="grid gap-4 rounded-3xl border border-line bg-page p-5"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate({ content, id: article?.id, status, title });
      }}
    >
      <input
        className="rounded-2xl border border-line bg-panel px-4 py-3"
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Название статьи"
        required
        value={title}
      />
      <textarea
        className="min-h-56 rounded-2xl border border-line bg-panel px-4 py-3 leading-7"
        onChange={(event) => setContent(event.target.value)}
        placeholder="Подтверждённая информация для ответов агента"
        required
        value={content}
      />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <select
          className="rounded-xl border border-line bg-panel px-4 py-3"
          onChange={(event) =>
            setStatus(event.target.value as KnowledgeArticle["status"])
          }
          value={status}
        >
          <option value="draft">Черновик</option>
          <option value="published">Опубликовано</option>
          <option value="archived">Архив</option>
        </select>
        <div className="flex gap-3">
          {article && article.status !== "published" && (
            <button
              className="inline-flex items-center gap-2 rounded-full border border-brand px-5 py-3 font-semibold text-brand"
              onClick={() => publish.mutate(article.id)}
              type="button"
            >
              <Send className="size-4" /> Опубликовать
            </button>
          )}
          <button
            className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-3 font-semibold text-brand-foreground"
            type="submit"
          >
            <Save className="size-4" /> Сохранить
          </button>
        </div>
      </div>
    </form>
  );
};
