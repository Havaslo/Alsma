export type MockAgentScenarioTrigger =
  "booking" | "consultation" | "fallback" | "spa" | "hardware-procedures";

export type MockAgentScenario = {
  readonly enabled: boolean;
  readonly id: string;
  readonly instructions: string;
  readonly response: string;
  readonly title: string;
  readonly trigger: MockAgentScenarioTrigger;
};

export type MockTransferCondition =
  "direct-request" | "low-confidence" | "request-type";

export type MockTransferRule = {
  readonly condition: MockTransferCondition;
  readonly description: string;
  readonly enabled: boolean;
  readonly id: string;
  readonly priority: number;
  readonly title: string;
};

export const MOCK_AGENT_SCENARIOS: readonly MockAgentScenario[] = [
  {
    enabled: false,
    id: "scenario-fallback",
    instructions:
      "Не придумывать факты. Сохранять дружелюбный тон даже при неопределённости.",
    response:
      "Если точного ответа нет, честно сообщите об этом и предложите перевод на менеджера или обратный звонок.",
    title: "Резервный ответ при нехватке данных",
    trigger: "fallback",
  },
  {
    enabled: true,
    id: "scenario-booking",
    instructions:
      "Не обещать наличие до проверки. В конце обязательно резюмировать собранные данные.",
    response:
      "Уточните даты, количество гостей, формат размещения и важные пожелания, затем кратко повторите детали и предложите следующий шаг.",
    title: "Бронирование с фиксацией деталей",
    trigger: "booking",
  },
  {
    enabled: true,
    id: "scenario-consultation",
    instructions:
      "Говорить спокойно, тепло и уверенно. Если гость сомневается, мягко предложить помощь с подбором.",
    response:
      "Начните с короткого приветствия, уточните, какой формат отдыха интересует гостя, и предложите 1–2 подходящих варианта без перегрузки деталями.",
    title: "Первичный ответ по консультации",
    trigger: "consultation",
  },
] as const;

export const MOCK_TRANSFER_RULES: readonly MockTransferRule[] = [
  {
    condition: "direct-request",
    description:
      "Если гость прямо просит соединить с менеджером без дополнительных уточнений, не удерживать диалог у агента.",
    enabled: true,
    id: "rule-direct-request",
    priority: 100,
    title: "Просьба позвать менеджера сразу",
  },
  {
    condition: "request-type",
    description:
      "Если запрос связан с групповым размещением, корпоративным заездом или нестандартной конфигурацией номеров, переводить на менеджера бронирований.",
    enabled: true,
    id: "rule-complex-booking",
    priority: 90,
    title: "Сложное бронирование передать менеджеру",
  },
  {
    condition: "low-confidence",
    description:
      "Если агент не уверен в ответе и не может подтвердить информацию по тарифам, услугам или ограничениям, предлагать обратный звонок от человека.",
    enabled: true,
    id: "rule-low-confidence",
    priority: 70,
    title: "Низкая уверенность — создать callback",
  },
] as const;

export const AGENT_SCENARIO_TRIGGER_OPTIONS = [
  { label: "Консультации", value: "consultation" },
  { label: "Бронирование", value: "booking" },
  { label: "Запасной ответ", value: "fallback" },
  { label: "SPA-отдых", value: "spa" },
  { label: "Аппаратные процедуры", value: "hardware-procedures" },
] as const;

export const TRANSFER_CONDITION_OPTIONS = [
  { label: "Прямая просьба позвать менеджера", value: "direct-request" },
  { label: "По типу обращения", value: "request-type" },
  { label: "По низкой уверенности ответа", value: "low-confidence" },
] as const;

export const AGENT_SCENARIO_TRIGGER_LABELS: Record<
  MockAgentScenarioTrigger,
  string
> = {
  booking: "Бронирование",
  consultation: "Консультации",
  fallback: "Запасной ответ",
  spa: "SPA-отдых",
  "hardware-procedures": "Аппаратные процедуры",
};

export const TRANSFER_CONDITION_LABELS: Record<MockTransferCondition, string> =
  {
    "direct-request": "Прямая просьба позвать менеджера",
    "low-confidence": "По низкой уверенности ответа",
    "request-type": "По типу обращения",
  };
