export const voiceAgentTools = [
  {
    type: "function",
    name: "get_events",
    description:
      "Получить свежий список опубликованных мероприятий или мероприятия на конкретную дату.",
    parameters: {
      type: "object",
      properties: {
        date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
      },
    },
  },
  {
    type: "function",
    name: "check_availability",
    description:
      "Проверить актуальную доступность номеров по датам и числу гостей.",
    parameters: {
      type: "object",
      properties: {
        checkIn: { type: "string" },
        checkOut: { type: "string" },
        adults: { type: "integer", minimum: 1 },
        children: { type: "array", items: { type: "integer", minimum: 0 } },
        roomCount: { type: "integer", minimum: 1 },
      },
      required: ["checkIn", "checkOut", "adults"],
    },
  },
  {
    type: "function",
    name: "transfer_to_manager",
    description:
      "Перевести звонок сотруднику по просьбе гостя или при отсутствии уверенного ответа. После вызова этого инструмента не продолжай диалог.",
    parameters: {
      type: "object",
      properties: { reason: { type: "string" } },
      required: ["reason"],
    },
  },
] as const;
