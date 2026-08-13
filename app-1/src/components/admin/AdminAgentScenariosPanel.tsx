import { useMemo, useState } from "react";

import { Plus } from "lucide-react";

import { AdminAgentScenarioCard } from "@/components/admin/AdminAgentScenarioCard";
import { AdminAgentTransferRuleCard } from "@/components/admin/AdminAgentTransferRuleCard";
import {
  type AgentSettingsTab,
  AgentSettingsTabPanel,
} from "@/components/admin/AgentSettingsTabPanel";
import { Button } from "@/components/ui/Button";
import type {
  AgentScenario,
  AgentTransferRule,
} from "@/lib/admin/agent-scenarios-api";
import {
  useAgentScenarios,
  useDeleteAgentScenario,
  useDeleteAgentTransferRule,
  useSaveAgentScenario,
  useSaveAgentTransferRule,
} from "@/lib/admin/useAgentScenarios";
import { cn } from "@/lib/cn";

type AgentScenariosTab = AgentSettingsTab | "rules" | "scenarios";
const SUMMARY_CARDS = [
  { key: "scenarios", label: "Сценариев ответов" },
  { key: "rules", label: "Правил перевода" },
  { key: "active", label: "Активно сейчас" },
] as const;
const TABS: Array<{ label: string; value: AgentScenariosTab }> = [
  { label: "Сценарии ответов", value: "scenarios" },
  { label: "Правила перевода", value: "rules" },
  { label: "Общие настройки", value: "general" },
  { label: "Возможности агента", value: "capabilities" },
  { label: "Данные клиента", value: "data" },
  { label: "Уведомления", value: "notifications" },
];

export const AdminAgentScenariosPanel = () => {
  const [tab, setTab] = useState<AgentScenariosTab>("scenarios");
  const scenariosQuery = useAgentScenarios();
  const saveScenario = useSaveAgentScenario();
  const saveRule = useSaveAgentTransferRule();
  const deleteScenario = useDeleteAgentScenario();
  const deleteRule = useDeleteAgentTransferRule();
  const scenarios = scenariosQuery.data?.scenarios ?? [];
  const rules = scenariosQuery.data?.transferRules ?? [];
  const activeCount = useMemo(
    () => [...scenarios, ...rules].filter((item) => item.enabled).length,
    [rules, scenarios],
  );
  const summaryValues = {
    active: activeCount,
    rules: rules.length,
    scenarios: scenarios.length,
  };
  const addScenario = () =>
    saveScenario.mutate({
      action: "answer",
      enabled: true,
      page: null,
      response: "",
      title: "Новый сценарий",
      trigger: "consultation",
    });
  const addRule = () =>
    saveRule.mutate({
      condition: "",
      destination: "booking-manager",
      enabled: true,
      title: "Новое правило",
    });
  const isListTab = tab === "scenarios" || tab === "rules";

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-3xl font-semibold text-brand">Сценарии агентов</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-ui-foreground">
          Настройте поведение AI-агента. Изменения сценариев и правил
          сохраняются в backend и применяются к новым ответам.
        </p>
      </section>
      <section className="grid gap-5 xl:grid-cols-3">
        {SUMMARY_CARDS.map(({ key, label }) => (
          <article
            className="rounded-3xl border border-line bg-brand-foreground p-5"
            key={key}
          >
            <p className="text-sm text-muted-ui-foreground">{label}</p>
            <p className="mt-3 text-3xl font-semibold text-brand">
              {summaryValues[key]}
            </p>
          </article>
        ))}
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
      {isListTab ? (
        <section className="rounded-3xl border border-line bg-brand-foreground p-6">
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-brand">
                {tab === "scenarios" ? "Сценарии ответов" : "Правила перевода"}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-ui-foreground">
                {tab === "scenarios"
                  ? "Изменяйте тексты, триггеры и следующее действие сценария для новых обращений."
                  : "Определяйте, когда разговор нужно перевести менеджеру или создать заявку."}
              </p>
            </div>
            <Button onClick={tab === "scenarios" ? addScenario : addRule}>
              <Plus className="size-4" />
              {tab === "scenarios" ? "Добавить сценарий" : "Добавить правило"}
            </Button>
          </header>
          <div className="mt-6 space-y-4">
            {tab === "scenarios"
              ? scenarios.map((item: AgentScenario) => (
                  <AdminAgentScenarioCard
                    item={item}
                    key={item.id}
                    onDelete={() => deleteScenario.mutate(item.id)}
                    onSave={(updated) => saveScenario.mutate(updated)}
                  />
                ))
              : rules.map((item: AgentTransferRule) => (
                  <AdminAgentTransferRuleCard
                    item={item}
                    key={item.id}
                    onDelete={() => deleteRule.mutate(item.id)}
                    onSave={(updated) => saveRule.mutate(updated)}
                  />
                ))}
            {!scenariosQuery.isLoading &&
              !(tab === "scenarios" ? scenarios.length : rules.length) && (
                <p className="rounded-2xl bg-page p-5 text-sm text-muted-ui-foreground">
                  Пока нет сохранённых записей.
                </p>
              )}
          </div>
        </section>
      ) : (
        <section className="rounded-3xl border border-line bg-brand-foreground p-6">
          <header className="mb-6">
            <h2 className="text-xl font-semibold text-brand">
              {TABS.find((item) => item.value === tab)?.label}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-ui-foreground">
              Настройки применяются ко всем новым диалогам AI-агента на сайте.
            </p>
          </header>
          <AgentSettingsTabPanel tab={tab as AgentSettingsTab} />
        </section>
      )}
    </div>
  );
};
