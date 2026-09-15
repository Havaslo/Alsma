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
    name: "transfer_to_manager",
    description:
      "Перевести звонок сотруднику по просьбе гостя или при отсутствии уверенного ответа. После вызова этого инструмента не продолжай диалог.",
    parameters: {
      type: "object",
      properties: { reason: { type: "string" } },
      required: ["reason"],
    },
  },
  {
    type: "function",
    name: "create_booking_request",
    description: "Сохранить заявку гостя на бронирование.",
    parameters: {
      type: "object",
      properties: {
        extracted: { type: "object" },
        comment: { type: "string" },
      },
      required: ["extracted"],
    },
  },
] as const;
