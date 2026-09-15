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
      "Если гость просит менеджера, сотрудника или оператора, не проверяй возможность соединения и не задавай уточняющих вопросов. Скажи коротко: «Одну секунду, соединяю вас с менеджером», затем немедленно вызови transfer_to_manager. При accepted=true не продолжай диалог; при accepted=false сообщи, что сейчас не удалось соединить с менеджером.",
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
