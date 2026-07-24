import { useState } from "react";

import { Plus } from "lucide-react";

import { AdminAgentScenarioCard } from "@/components/admin/AdminAgentScenarioCard";
import { AdminAgentTransferRuleCard } from "@/components/admin/AdminAgentTransferRuleCard";
import { Button } from "@/components/ui/Button";
import {
  MOCK_AGENT_SCENARIOS,
  MOCK_TRANSFER_RULES,
  type MockAgentScenario,
  type MockTransferRule,
} from "@/lib/admin/admin-agent-scenario-mocks";
import { cn } from "@/lib/cn";

type AgentScenariosTab = "rules" | "scenarios";

const SUMMARY_CARDS = [
  { key: "scenarios", label: "Сценариев ответов" },
  { key: "rules", label: "Правил перевода" },
  { key: "active", label: "Активно сейчас" },
] as const;

export const AdminAgentScenariosPanel = () => {
  const [tab, setTab] = useState<AgentScenariosTab>("scenarios");
  const [scenarios, setScenarios] = useState<MockAgentScenario[]>(() => [
    ...MOCK_AGENT_SCENARIOS,
  ]);
  const [rules, setRules] = useState<MockTransferRule[]>(() => [
    ...MOCK_TRANSFER_RULES,
  ]);
  const activeCount =
    scenarios.filter((item) => item.enabled).length +
    rules.filter((item) => item.enabled).length;
  const summaryValues = {
    active: activeCount,
    rules: rules.length,
    scenarios: scenarios.length,
  };

  const addScenario = () => {
    setScenarios((current) => [
      {
        enabled: true,
        id: `scenario-${Date.now()}`,
        instructions: "",
        response: "",
        title: "Новый сценарий",
        trigger: "consultation",
      },
      ...current,
    ]);
  };

  const addRule = () => {
    setRules((current) => [
      {
        condition: "direct-request",
        description: "",
        enabled: true,
        id: `rule-${Date.now()}`,
        priority: 50,
        title: "Новое правило",
      },
      ...current,
    ]);
  };

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-3xl font-semibold text-brand">Сценарии агентов</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-ui-foreground">
          Управляйте готовыми ответами и правилами перевода, чтобы агент говорил
          в нужном тоне и вовремя подключал менеджера.
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

      <section className="border-b border-line">
        <div className="flex items-end gap-8">
          {[
            ["scenarios", "Сценарии ответов"],
            ["rules", "Правила перевода"],
          ].map(([value, label]) => (
            <button
              className={cn(
                "border-b-2 pb-3 text-base font-semibold transition",
                tab === value
                  ? "border-brand text-brand"
                  : "border-transparent text-muted-ui-foreground",
              )}
              key={value}
              onClick={() => setTab(value as AgentScenariosTab)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-line bg-brand-foreground p-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-brand">
              {tab === "scenarios" ? "Сценарии ответов" : "Правила перевода"}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-ui-foreground">
              {tab === "scenarios"
                ? "Изменяйте текст ответов и дополнительные указания для новых обращений."
                : "Определяйте, когда разговор нужно перевести менеджеру или поставить в обратный звонок."}
            </p>
          </div>
          <Button onClick={tab === "scenarios" ? addScenario : addRule}>
            <Plus className="size-4" />
            {tab === "scenarios" ? "Добавить сценарий" : "Добавить правило"}
          </Button>
        </header>

        <div className="mt-6 space-y-4">
          {tab === "scenarios"
            ? scenarios.map((item) => (
                <AdminAgentScenarioCard
                  item={item}
                  key={item.id}
                  onDelete={() =>
                    setScenarios((current) =>
                      current.filter((scenario) => scenario.id !== item.id),
                    )
                  }
                  onSave={(updatedItem) =>
                    setScenarios((current) =>
                      current.map((scenario) =>
                        scenario.id === updatedItem.id ? updatedItem : scenario,
                      ),
                    )
                  }
                />
              ))
            : rules.map((item) => (
                <AdminAgentTransferRuleCard
                  item={item}
                  key={item.id}
                  onDelete={() =>
                    setRules((current) =>
                      current.filter((rule) => rule.id !== item.id),
                    )
                  }
                  onSave={(updatedItem) =>
                    setRules((current) =>
                      current.map((rule) =>
                        rule.id === updatedItem.id ? updatedItem : rule,
                      ),
                    )
                  }
                />
              ))}
        </div>
      </section>
    </div>
  );
};
