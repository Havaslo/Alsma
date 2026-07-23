import { useState } from "react";

import { CirclePlus } from "lucide-react";

import { KnowledgeAnswerTester } from "@/components/admin/KnowledgeAnswerTester";
import { KnowledgeArticleEditor } from "@/components/admin/KnowledgeArticleEditor";
import { KnowledgeRuleEditor } from "@/components/admin/KnowledgeRuleEditor";
import { Loader } from "@/components/ui/Loader";
import { useKnowledgeBase } from "@/lib/admin/useKnowledgeBase";

type KnowledgeTab = "articles" | "logs" | "rules";

const tabs: Array<{ label: string; value: KnowledgeTab }> = [
  { label: "Статьи базы знаний", value: "articles" },
  { label: "Правила ответа", value: "rules" },
  { label: "Логи запросов", value: "logs" },
];

export const AdminKnowledgeBasePanel = () => {
  const knowledge = useKnowledgeBase();
  const [tab, setTab] = useState<KnowledgeTab>("articles");
  const [articleId, setArticleId] = useState<string | null>(null);
  const [ruleId, setRuleId] = useState<string | null>(null);
  const article = knowledge.data?.articles.find(
    (item) => item.id === articleId,
  );
  const rule = knowledge.data?.rules.find((item) => item.id === ruleId);
  const publishedArticles =
    knowledge.data?.articles.filter((item) => item.status === "published")
      .length ?? 0;
  const enabledRules =
    knowledge.data?.rules.filter((item) => item.enabled).length ?? 0;

  if (knowledge.isLoading)
    return (
      <div className="grid place-items-center p-20">
        <Loader className="text-brand" />
      </div>
    );

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-3xl font-semibold text-brand">
          База знаний для AI-агентов
        </h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-ui-foreground">
          Управляйте статьями, правилами поведения агента, публикацией версий и
          тестируйте ответы AI только на надёжных фрагментах знаний.
        </p>
      </section>

      <section className="grid gap-4 xl:grid-cols-4">
        {[
          ["Всего статей", knowledge.data?.articles.length ?? 0],
          ["Активных правил", enabledRules],
          ["Логов запросов", knowledge.data?.logs.length ?? 0],
          ["Опубликовано", publishedArticles],
        ].map(([label, value]) => (
          <article
            className="rounded-3xl border border-line bg-brand-foreground p-5"
            key={label}
          >
            <p className="text-sm text-muted-ui-foreground">{label}</p>
            <p className="mt-3 text-3xl font-semibold text-brand">{value}</p>
          </article>
        ))}
      </section>

      <section className="border-b border-line">
        <div className="flex items-end gap-8">
          {tabs.map((item) => (
            <button
              className={`border-b-2 pb-3 text-sm font-semibold transition ${
                tab === item.value
                  ? "border-brand text-brand"
                  : "border-transparent text-muted-ui-foreground"
              }`}
              key={item.value}
              onClick={() => setTab(item.value)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {tab === "articles" && (
        <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <article className="rounded-3xl border border-line bg-brand-foreground p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-brand">
                  Статьи базы знаний
                </h2>
                <p className="mt-2 text-sm text-muted-ui-foreground">
                  Статьи сохраняются сразу в базу и сразу становятся рабочей
                  версией для поиска.
                </p>
              </div>
              <button
                className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-xs font-semibold text-brand-foreground"
                onClick={() => setArticleId(null)}
                type="button"
              >
                <CirclePlus className="size-4" />
                Новая статья
              </button>
            </div>
            <div className="mt-5 space-y-3">
              {knowledge.data?.articles.map((item) => (
                <button
                  className={`w-full rounded-2xl border p-4 text-left ${
                    articleId === item.id
                      ? "border-brand bg-brand/5"
                      : "border-line bg-page"
                  }`}
                  key={item.id}
                  onClick={() => setArticleId(item.id)}
                  type="button"
                >
                  <span className="font-semibold">{item.title}</span>
                  <span className="mt-2 flex items-center justify-between text-xs text-muted-ui-foreground">
                    <span>Фрагментов: {item._count.chunks}</span>
                    <span>{item.status}</span>
                  </span>
                </button>
              ))}
            </div>
          </article>

          <article className="rounded-3xl border border-line bg-brand-foreground p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-brand">
                  Редактор статьи
                </h2>
                <p className="mt-2 text-sm text-muted-ui-foreground">
                  Начните править с общих принципов, а не частных кейсов.
                </p>
              </div>
              <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
                {article?.status ?? "Новая"}
              </span>
            </div>
            <div className="mt-5">
              <KnowledgeArticleEditor
                article={article}
                key={article?.id ?? "new"}
              />
            </div>
          </article>
        </section>
      )}

      {tab === "rules" && (
        <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <article className="rounded-3xl border border-line bg-brand-foreground p-6">
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-xl font-semibold text-brand">
                Правила ответа
              </h2>
              <button
                className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-xs font-semibold text-brand-foreground"
                onClick={() => setRuleId(null)}
                type="button"
              >
                <CirclePlus className="size-4" />
                Новое правило
              </button>
            </div>
            <div className="mt-5 space-y-3">
              {knowledge.data?.rules.map((item) => (
                <button
                  className={`w-full rounded-2xl border p-4 text-left ${
                    ruleId === item.id
                      ? "border-brand bg-brand/5"
                      : "border-line bg-page"
                  }`}
                  key={item.id}
                  onClick={() => setRuleId(item.id)}
                  type="button"
                >
                  <span className="font-semibold">{item.title}</span>
                  <span className="mt-2 block text-xs text-muted-ui-foreground">
                    Приоритет: {item.priority} ·{" "}
                    {item.enabled ? "Активно" : "Отключено"}
                  </span>
                </button>
              ))}
            </div>
          </article>
          <article className="rounded-3xl border border-line bg-brand-foreground p-6">
            <h2 className="text-xl font-semibold text-brand">
              Редактор правила
            </h2>
            <div className="mt-5">
              <KnowledgeRuleEditor key={rule?.id ?? "new"} rule={rule} />
            </div>
          </article>
        </section>
      )}

      {tab === "logs" && (
        <section className="overflow-hidden rounded-3xl border border-line bg-brand-foreground">
          <div className="grid grid-cols-[1fr_1.5fr_0.5fr] gap-4 bg-page px-5 py-4 text-xs font-semibold">
            <span>Вопрос</span>
            <span>Ответ</span>
            <span>Источники</span>
          </div>
          {knowledge.data?.logs.map((log) => (
            <article
              className="grid grid-cols-[1fr_1.5fr_0.5fr] gap-4 border-t border-line px-5 py-5 text-sm"
              key={log.id}
            >
              <strong>{log.query}</strong>
              <span className="text-muted-ui-foreground">
                {log.answer || "Ответ не сформирован"}
              </span>
              <span>{log.sources.length}</span>
            </article>
          ))}
        </section>
      )}

      <KnowledgeAnswerTester />
    </div>
  );
};
