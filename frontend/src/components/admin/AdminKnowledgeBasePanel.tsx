import { useState } from "react";

import { CirclePlus } from "lucide-react";

import { KnowledgeAnswerTester } from "@/components/admin/KnowledgeAnswerTester";
import { KnowledgeArticleEditor } from "@/components/admin/KnowledgeArticleEditor";
import { KnowledgeRuleEditor } from "@/components/admin/KnowledgeRuleEditor";
import { Loader } from "@/components/ui/Loader";
import { useKnowledgeBase } from "@/lib/admin/useKnowledgeBase";

export const AdminKnowledgeBasePanel = () => {
  const knowledge = useKnowledgeBase();
  const [articleId, setArticleId] = useState<string | null>(null);
  const [ruleId, setRuleId] = useState<string | null>(null);
  const article = knowledge.data?.articles.find(
    (item) => item.id === articleId,
  );
  const rule = knowledge.data?.rules.find((item) => item.id === ruleId);

  return (
    <section className="rounded-3xl border border-line bg-brand-foreground p-6">
      <h2 className="text-3xl font-semibold">Контент AI-агента</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-ui-foreground">
        Управляйте материалами и правилами, на которые опирается агент в
        диалогах с гостями.
      </p>
      {knowledge.isLoading ? (
        <div className="grid place-items-center p-12">
          <Loader className="text-brand" />
        </div>
      ) : (
        <div className="mt-6 grid gap-8 xl:grid-cols-2">
          <div>
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-2xl font-semibold">Статьи</h3>
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
              <h3 className="text-2xl font-semibold">Правила ответа</h3>
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
      <KnowledgeAnswerTester />
      {!!knowledge.data?.logs.length && (
        <div className="mt-8">
          <h3 className="text-2xl font-semibold">Последние вопросы</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {knowledge.data.logs.slice(0, 6).map((log) => (
              <article
                className="rounded-2xl border border-line bg-page p-4"
                key={log.id}
              >
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
