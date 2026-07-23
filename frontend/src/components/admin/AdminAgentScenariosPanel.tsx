import { useState } from "react";
import { useForm } from "react-hook-form";

import { CirclePlus } from "lucide-react";

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
  const [tab, setTab] = useState<"rules" | "scenarios">("scenarios");
  const [showNew, setShowNew] = useState(false);
  const scenarios = data.data?.scenarios ?? [];
  const rules = data.data?.transferRules ?? [];
  const activeCount =
    scenarios.filter((item) => item.enabled).length +
    rules.filter((item) => item.enabled).length;

  return (
    <div className="space-y-6">
      <section className="grid gap-5 xl:grid-cols-3">
        {[
          ["Сценариев ответов", scenarios.length],
          ["Правил перевода", rules.length],
          ["Активно сейчас", activeCount],
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
          {[
            ["scenarios", "Сценарии ответов"],
            ["rules", "Правила перевода"],
          ].map(([value, label]) => (
            <button
              className={`border-b-2 pb-3 text-base font-semibold transition ${
                tab === value
                  ? "border-brand text-brand"
                  : "border-transparent text-muted-ui-foreground"
              }`}
              key={value}
              onClick={() => {
                setTab(value as "rules" | "scenarios");
                setShowNew(false);
              }}
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
                ? "Изменяйте текст ответов, тон общения и дополнительные указания для новых звонков."
                : "Определяйте, когда звонок нужно перевести человеку, поставить в обратный звонок или оставить у агента."}
            </p>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-semibold text-brand-foreground"
            onClick={() => setShowNew(true)}
            type="button"
          >
            <CirclePlus className="size-4" />
            {tab === "scenarios" ? "Добавить сценарий" : "Добавить правило"}
          </button>
        </header>

        <div className="mt-6 space-y-4">
          {showNew && (
            <article className="rounded-3xl border border-line bg-page p-5">
              <h3 className="text-lg font-semibold text-brand">
                {tab === "scenarios" ? "Новый сценарий" : "Новое правило"}
              </h3>
              {tab === "scenarios" ? <ScenarioEditor /> : <RuleEditor />}
            </article>
          )}
          {tab === "scenarios"
            ? scenarios.map((item) => (
                <article
                  className="rounded-3xl border border-line bg-page p-5"
                  key={item.id}
                >
                  <div>
                    <h3 className="text-lg font-semibold text-brand">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-sm text-muted-ui-foreground">
                      Применение: {item.trigger}
                    </p>
                  </div>
                  <ScenarioEditor item={item} />
                </article>
              ))
            : rules.map((item) => (
                <article
                  className="rounded-3xl border border-line bg-page p-5"
                  key={item.id}
                >
                  <div>
                    <h3 className="text-lg font-semibold text-brand">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-sm text-muted-ui-foreground">
                      Получатель: {item.destination}
                    </p>
                  </div>
                  <RuleEditor item={item} />
                </article>
              ))}
        </div>
      </section>
    </div>
  );
};
