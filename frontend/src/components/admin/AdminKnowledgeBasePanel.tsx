import { useState } from "react";

import { AdminKnowledgeArticlesTab } from "@/components/admin/AdminKnowledgeArticlesTab";
import { AdminKnowledgeLogsTab } from "@/components/admin/AdminKnowledgeLogsTab";
import { AdminKnowledgeRulesTab } from "@/components/admin/AdminKnowledgeRulesTab";
import { Loader } from "@/components/ui/Loader";
import { useKnowledgeBase } from "@/lib/admin/useKnowledgeBase";
import { cn } from "@/lib/cn";

type KnowledgeTab = "articles" | "logs" | "rules";

const TABS: Array<{ label: string; value: KnowledgeTab }> = [
  { label: "Статьи базы знаний", value: "articles" },
  { label: "Правила агента", value: "rules" },
  { label: "Логи запросов", value: "logs" },
];

export const AdminKnowledgeBasePanel = () => {
  const knowledge = useKnowledgeBase();
  const [tab, setTab] = useState<KnowledgeTab>("articles");
  const [articleId, setArticleId] = useState<string | null | undefined>();
  const [ruleId, setRuleId] = useState<string | null | undefined>();

  if (knowledge.isLoading)
    return (
      <div className="grid place-items-center p-20">
        <Loader className="text-brand" />
      </div>
    );

  const articles = knowledge.data?.articles ?? [];
  const rules = knowledge.data?.rules ?? [];
  const logs = knowledge.data?.logs ?? [];
  const selectedArticleId =
    articleId === undefined ? articles[0]?.id : articleId;
  const selectedRuleId = ruleId === undefined ? rules[0]?.id : ruleId;
  const selectedArticle = articles.find(
    (item) => item.id === selectedArticleId,
  );
  const selectedRule = rules.find((item) => item.id === selectedRuleId);

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-3xl font-semibold text-brand">
          База знаний для AI-агентов
        </h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-ui-foreground">
          Управляйте статьями, правилами поведения агента и отслеживайте ответы
          AI только по найденным фрагментам знаний.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Всего статей" value={articles.length} />
        <SummaryCard
          label="Активных правил"
          value={rules.filter((item) => item.enabled).length}
        />
        <SummaryCard label="Логов запросов" value={logs.length} />
        <article className="rounded-3xl border border-line bg-brand-foreground p-5">
          <p className="text-sm text-muted-ui-foreground">RAG-схема</p>
          <p className="mt-3 text-sm leading-6">
            Статьи → чанки → поиск релевантных фрагментов → ответ по найденному
            контексту.
          </p>
        </article>
      </section>

      <nav className="flex gap-8 overflow-x-auto border-b border-line">
        {TABS.map((item) => (
          <button
            className={cn(
              "shrink-0 border-b-2 pb-3 text-sm font-semibold transition",
              tab === item.value
                ? "border-brand text-brand"
                : "border-transparent text-muted-ui-foreground hover:text-page-foreground",
            )}
            key={item.value}
            onClick={() => setTab(item.value)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </nav>

      {tab === "articles" && (
        <AdminKnowledgeArticlesTab
          articles={articles}
          onSelect={setArticleId}
          selectedArticle={selectedArticle}
          selectedId={selectedArticleId}
        />
      )}
      {tab === "rules" && (
        <AdminKnowledgeRulesTab
          onSelect={setRuleId}
          rules={rules}
          selectedId={selectedRuleId}
          selectedRule={selectedRule}
        />
      )}
      {tab === "logs" && <AdminKnowledgeLogsTab logs={logs} />}
    </div>
  );
};

const SummaryCard = ({
  label,
  value,
}: {
  readonly label: string;
  readonly value: number;
}) => (
  <article className="rounded-3xl border border-line bg-brand-foreground p-5">
    <p className="text-sm text-muted-ui-foreground">{label}</p>
    <p className="mt-3 text-3xl font-semibold text-brand">{value}</p>
  </article>
);
