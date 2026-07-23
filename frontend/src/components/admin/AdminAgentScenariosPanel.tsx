import { useState } from "react";
import { useForm } from "react-hook-form";

import { Bot, CirclePlus } from "lucide-react";

import { Form } from "@/components/Form";
import type {
  AgentScenario,
  AgentTransferRule,
} from "@/lib/admin/agent-scenarios-api";
import {
  useAgentScenarios,
  useSaveAgentScenario,
  useSaveAgentTransferRule,
} from "@/lib/admin/useAgentScenarios";

const fieldClass = "w-full rounded-2xl border border-line bg-page px-4 py-3";

type ScenarioFormValues = Pick<
  AgentScenario,
  "enabled" | "response" | "title" | "trigger"
>;

const ScenarioEditor = ({ item }: { readonly item?: AgentScenario }) => {
  const save = useSaveAgentScenario();
  const form = useForm<ScenarioFormValues>({
    defaultValues: {
      enabled: item?.enabled ?? true,
      response: item?.response ?? "",
      title: item?.title ?? "",
      trigger: item?.trigger ?? "Консультации",
    },
  });

  return (
    <Form
      className="mt-4 grid gap-3"
      form={form}
      onSubmit={(values) => {
        save.mutate({ ...values, id: item?.id });
      }}
    >
      <input
        className={fieldClass}
        placeholder="Название сценария"
        {...form.register("title", { required: true })}
      />
      <select className={fieldClass} {...form.register("trigger")}>
        {[
          "Консультации",
          "Бронирование",
          "Перевод на менеджера",
          "Запасной ответ",
        ].map((value) => (
          <option key={value}>{value}</option>
        ))}
      </select>
      <textarea
        className={`${fieldClass} min-h-36`}
        placeholder="Текст и инструкции ответа"
        {...form.register("response", { required: true })}
      />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" {...form.register("enabled")} /> Активен
      </label>
      <button
        className="rounded-full bg-brand px-5 py-3 font-semibold text-brand-foreground"
        type="submit"
      >
        Сохранить сценарий
      </button>
    </Form>
  );
};

type TransferRuleFormValues = Pick<
  AgentTransferRule,
  "condition" | "destination" | "enabled" | "title"
>;

const RuleEditor = ({ item }: { readonly item?: AgentTransferRule }) => {
  const save = useSaveAgentTransferRule();
  const form = useForm<TransferRuleFormValues>({
    defaultValues: {
      condition: item?.condition ?? "",
      destination: item?.destination ?? "Менеджер бронирования",
      enabled: item?.enabled ?? true,
      title: item?.title ?? "",
    },
  });

  return (
    <Form
      className="mt-4 grid gap-3"
      form={form}
      onSubmit={(values) => {
        save.mutate({ ...values, id: item?.id });
      }}
    >
      <input
        className={fieldClass}
        placeholder="Название правила"
        {...form.register("title", { required: true })}
      />
      <input
        className={fieldClass}
        placeholder="Кому передать"
        {...form.register("destination", { required: true })}
      />
      <textarea
        className={`${fieldClass} min-h-32`}
        placeholder="Условия передачи"
        {...form.register("condition", { required: true })}
      />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" {...form.register("enabled")} /> Активно
      </label>
      <button
        className="rounded-full bg-brand px-5 py-3 font-semibold text-brand-foreground"
        type="submit"
      >
        Сохранить правило
      </button>
    </Form>
  );
};

export const AdminAgentScenariosPanel = () => {
  const data = useAgentScenarios();
  const [scenarioId, setScenarioId] = useState<string>();
  const [ruleId, setRuleId] = useState<string>();
  const scenario = data.data?.scenarios.find((item) => item.id === scenarioId);
  const rule = data.data?.transferRules.find((item) => item.id === ruleId);
  return (
    <section className="mt-8 rounded-3xl border border-line bg-panel p-6">
      <p className="flex items-center gap-2 text-sm font-semibold text-brand">
        <Bot className="size-4" /> Сценарии AI-агента
      </p>
      <h2 className="mt-1 font-heading text-3xl font-semibold">
        Ответы и передача менеджеру
      </h2>
      <div className="mt-6 grid gap-8 xl:grid-cols-2">
        <div>
          <header className="flex justify-between">
            <h3 className="text-xl font-semibold">Сценарии ответов</h3>
            <button
              className="flex items-center gap-1 text-brand"
              onClick={() => setScenarioId(undefined)}
              type="button"
            >
              <CirclePlus className="size-4" /> Новый
            </button>
          </header>
          <div className="mt-3 flex flex-wrap gap-2">
            {data.data?.scenarios.map((item) => (
              <button
                className="rounded-full bg-brand/10 px-3 py-2 text-sm text-brand"
                key={item.id}
                onClick={() => setScenarioId(item.id)}
                type="button"
              >
                {item.title}
              </button>
            ))}
          </div>
          <ScenarioEditor item={scenario} key={scenario?.id ?? "new"} />
        </div>
        <div>
          <header className="flex justify-between">
            <h3 className="text-xl font-semibold">Правила передачи</h3>
            <button
              className="flex items-center gap-1 text-brand"
              onClick={() => setRuleId(undefined)}
              type="button"
            >
              <CirclePlus className="size-4" /> Новое
            </button>
          </header>
          <div className="mt-3 flex flex-wrap gap-2">
            {data.data?.transferRules.map((item) => (
              <button
                className="rounded-full bg-brand/10 px-3 py-2 text-sm text-brand"
                key={item.id}
                onClick={() => setRuleId(item.id)}
                type="button"
              >
                {item.title}
              </button>
            ))}
          </div>
          <RuleEditor item={rule} key={rule?.id ?? "new"} />
        </div>
      </div>
    </section>
  );
};
