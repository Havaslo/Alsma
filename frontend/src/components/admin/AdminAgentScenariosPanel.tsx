import { useState } from "react";

import { Bot, CirclePlus } from "lucide-react";

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

const ScenarioEditor = ({ item }: { readonly item?: AgentScenario }) => {
  const save = useSaveAgentScenario();
  const [title, setTitle] = useState(item?.title ?? "");
  const [trigger, setTrigger] = useState(item?.trigger ?? "Консультации");
  const [response, setResponse] = useState(item?.response ?? "");
  const [enabled, setEnabled] = useState(item?.enabled ?? true);
  return (
    <form
      className="mt-4 grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate({ enabled, id: item?.id, response, title, trigger });
      }}
    >
      <input
        className={fieldClass}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Название сценария"
        required
        value={title}
      />
      <select
        className={fieldClass}
        onChange={(event) => setTrigger(event.target.value)}
        value={trigger}
      >
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
        onChange={(event) => setResponse(event.target.value)}
        placeholder="Текст и инструкции ответа"
        required
        value={response}
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
          type="checkbox"
        />{" "}
        Активен
      </label>
      <button
        className="rounded-full bg-brand px-5 py-3 font-semibold text-brand-foreground"
        type="submit"
      >
        Сохранить сценарий
      </button>
    </form>
  );
};

const RuleEditor = ({ item }: { readonly item?: AgentTransferRule }) => {
  const save = useSaveAgentTransferRule();
  const [title, setTitle] = useState(item?.title ?? "");
  const [destination, setDestination] = useState(
    item?.destination ?? "Менеджер бронирования",
  );
  const [condition, setCondition] = useState(item?.condition ?? "");
  const [enabled, setEnabled] = useState(item?.enabled ?? true);
  return (
    <form
      className="mt-4 grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate({ condition, destination, enabled, id: item?.id, title });
      }}
    >
      <input
        className={fieldClass}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Название правила"
        required
        value={title}
      />
      <input
        className={fieldClass}
        onChange={(event) => setDestination(event.target.value)}
        placeholder="Кому передать"
        required
        value={destination}
      />
      <textarea
        className={`${fieldClass} min-h-32`}
        onChange={(event) => setCondition(event.target.value)}
        placeholder="Условия передачи"
        required
        value={condition}
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
          type="checkbox"
        />{" "}
        Активно
      </label>
      <button
        className="rounded-full bg-brand px-5 py-3 font-semibold text-brand-foreground"
        type="submit"
      >
        Сохранить правило
      </button>
    </form>
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
