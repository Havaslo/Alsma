import { Plus } from "lucide-react";

import { KnowledgeArticleEditor } from "@/components/admin/KnowledgeArticleEditor";
import { Button } from "@/components/ui/Button";
import type { KnowledgeArticle } from "@/lib/admin/knowledge-base-api";
import { cn } from "@/lib/cn";

const STATUS_LABELS: Record<KnowledgeArticle["status"], string> = {
  archived: "В архиве",
  draft: "Черновик",
  published: "Опубликовано",
};

export const AdminKnowledgeArticlesTab = ({
  articles,
  onSelect,
  selectedArticle,
  selectedId,
}: {
  readonly articles: KnowledgeArticle[];
  readonly onSelect: (id: string | null) => void;
  readonly selectedArticle?: KnowledgeArticle;
  readonly selectedId: string | null | undefined;
}) => (
  <section className="grid items-start gap-6 xl:grid-cols-[0.8fr_1.2fr]">
    <article className="rounded-3xl border border-line bg-brand-foreground p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-brand">
            Статьи базы знаний
          </h2>
          <p className="mt-2 max-w-lg text-sm leading-6 text-muted-ui-foreground">
            Статья сохраняется в базе и становится рабочей версией для поиска
            после публикации.
          </p>
        </div>
        <Button onClick={() => onSelect(null)} variant="secondary">
          <Plus className="size-4" />
          Новая статья
        </Button>
      </div>
      <div className="mt-5 space-y-3">
        {articles.map((article) => (
          <button
            className={cn(
              "w-full rounded-2xl border p-4 text-left transition",
              selectedId === article.id
                ? "border-brand bg-brand/5"
                : "border-line bg-page hover:border-brand/40",
            )}
            key={article.id}
            onClick={() => onSelect(article.id)}
            type="button"
          >
            <span className="flex items-start justify-between gap-3">
              <strong className="text-brand">{article.title}</strong>
              <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
                {STATUS_LABELS[article.status]}
              </span>
            </span>
            <span className="mt-2 block text-sm text-muted-ui-foreground">
              {article.summary || "Описание не добавлено"}
            </span>
            <span className="mt-3 block text-xs text-muted-ui-foreground">
              Slug: {article.slug || "—"} ·{" "}
              {[article.category, ...article.tags]
                .filter(Boolean)
                .join(" · ") || "Без категории"}
            </span>
          </button>
        ))}
        {!articles.length && (
          <p className="rounded-2xl bg-page p-5 text-sm text-muted-ui-foreground">
            Статей пока нет.
          </p>
        )}
      </div>
    </article>

    <article className="rounded-3xl border border-line bg-brand-foreground p-6">
      <div>
        <h2 className="text-xl font-semibold text-brand">Редактор статьи</h2>
        <p className="mt-2 text-sm leading-6 text-muted-ui-foreground">
          Пишите правила и общие принципы: AI будет искать релевантные
          фрагменты, а не читать всю базу целиком.
        </p>
      </div>
      <div className="mt-6">
        <KnowledgeArticleEditor
          article={selectedArticle}
          key={selectedArticle?.id ?? "new"}
        />
      </div>
      <p className="mt-6 rounded-2xl border border-line bg-page p-4 text-sm leading-6">
        <strong className="text-brand">Как это работает:</strong> после
        сохранения опубликованная статья автоматически пересобирается для
        поиска.
      </p>
    </article>
  </section>
);
