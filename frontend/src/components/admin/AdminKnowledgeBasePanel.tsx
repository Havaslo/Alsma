import { useState } from "react";

import {
  BookOpen,
  CirclePlus,
  LoaderCircle,
  MessageCircleQuestion,
} from "lucide-react";

import { KnowledgeArticleEditor } from "@/components/admin/KnowledgeArticleEditor";
import { KnowledgeRuleEditor } from "@/components/admin/KnowledgeRuleEditor";
import {
  useKnowledgeBase,
  useTestKnowledgeAnswer,
} from "@/lib/admin/useKnowledgeBase";

export const AdminKnowledgeBasePanel = () => {
  const knowledge = useKnowledgeBase();
  const test = useTestKnowledgeAnswer();
  const [articleId, setArticleId] = useState<string | null>(null);
  const [ruleId, setRuleId] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const article = knowledge.data?.articles.find(
    (item) => item.id === articleId,
  );
  const rule = knowledge.data?.rules.find((item) => item.id === ruleId);

  return (
    <section className="mt-8 rounded-3xl border border-line bg-panel p-6">
      <p className="flex items-center gap-2 text-sm font-semibold text-brand">
        <BookOpen className="size-4" /> База знаний
      </p>
      <h2 className="mt-1 font-heading text-3xl font-semibold">
        Контент AI-агента
      </h2>
      {knowledge.isLoading ? (
        <div className="grid place-items-center p-12">
          <LoaderCircle className="size-7 animate-spin text-brand" />
        </div>
      ) : (
        <div className="mt-6 grid gap-8 xl:grid-cols-2">
          <div>
            <div className="flex items-center justify-between gap-4">
              <h3 className="font-heading text-2xl font-semibold">Статьи</h3>
              <button
                className="flex items-center gap-2 text-sm font-semibold text-brand"
                onClick={() => setArticleId(null)}
                type="button"
              >
                <CirclePlus className="size-4" /> Новая
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {knowledge.data?.articles.map((item) => (
                <button
                  className={`rounded-full px-4 py-2 text-sm ${articleId === item.id ? "bg-brand text-brand-foreground" : "bg-brand/10 text-brand"}`}
                  key={item.id}
                  onClick={() => setArticleId(item.id)}
                  type="button"
                >
                  {item.title} · {item._count.chunks}
                </button>
              ))}
            </div>
            <div className="mt-4">
              <KnowledgeArticleEditor
                key={article?.id ?? "new"}
                article={article}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between gap-4">
              <h3 className="font-heading text-2xl font-semibold">
                Правила ответа
              </h3>
              <button
                className="flex items-center gap-2 text-sm font-semibold text-brand"
                onClick={() => setRuleId(null)}
                type="button"
              >
                <CirclePlus className="size-4" /> Новое
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {knowledge.data?.rules.map((item) => (
                <button
                  className={`rounded-full px-4 py-2 text-sm ${ruleId === item.id ? "bg-brand text-brand-foreground" : "bg-brand/10 text-brand"}`}
                  key={item.id}
                  onClick={() => setRuleId(item.id)}
                  type="button"
                >
                  {item.title}
                </button>
              ))}
            </div>
            <div className="mt-4">
              <KnowledgeRuleEditor key={rule?.id ?? "new"} rule={rule} />
            </div>
          </div>
        </div>
      )}
      <form
        className="mt-8 rounded-3xl bg-brand p-6 text-brand-foreground"
        onSubmit={(event) => {
          event.preventDefault();
          test.mutate({ channel: "text", question });
        }}
      >
        <h3 className="flex items-center gap-2 font-heading text-2xl font-semibold">
          <MessageCircleQuestion className="size-5" /> Проверка ответа
        </h3>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            className="min-w-0 flex-1 rounded-full border border-brand-foreground/20 bg-brand-foreground/10 px-5 py-3"
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Задайте вопрос базе знаний"
            required
            value={question}
          />
          <button
            className="rounded-full bg-panel px-6 py-3 font-semibold text-brand"
            type="submit"
          >
            Проверить
          </button>
        </div>
        {test.data && (
          <div className="mt-5 rounded-2xl bg-brand-foreground/10 p-5">
            <p>{test.data.answer}</p>
            <p className="mt-3 text-sm text-brand-foreground/60">
              Источников: {test.data.sources.length}
            </p>
          </div>
        )}
      </form>
      {!!knowledge.data?.logs.length && (
        <div className="mt-8">
          <h3 className="font-heading text-2xl font-semibold">
            Последние вопросы
          </h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {knowledge.data.logs.slice(0, 6).map((log) => (
              <article className="rounded-2xl bg-page p-4" key={log.id}>
                <p className="font-semibold">{log.query}</p>
                <p className="mt-2 line-clamp-2 text-sm text-muted-ui-foreground">
                  {log.answer}
                </p>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
