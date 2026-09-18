export const voiceAgentTools = [
  {
    type: "function",
    name: "check_availability",
    description:
      "Проверить актуальное наличие номеров Eptera по датам и составу гостей. Только чтение: не создаёт бронь и не создаёт платёж.",
    parameters: {
      type: "object",
      properties: {
        checkIn: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
        checkOut: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
        adults: { type: "integer", minimum: 1, maximum: 12 },
        childAges: {
          type: "array",
          items: { type: "integer", minimum: 0, maximum: 17 },
          maxItems: 8,
        },
        roomCount: { type: "integer", minimum: 1, maximum: 2 },
      },
      required: ["checkIn", "checkOut", "adults"],
    },
  },
  {
    type: "function",
    name: "compare_rooms",
    description:
      "Получить и сравнить актуальные варианты номеров и тарифов Eptera по датам и составу гостей. Только чтение: не создаёт бронь и не создаёт платёж.",
    parameters: {
      type: "object",
      properties: {
        checkIn: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
        checkOut: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
        adults: { type: "integer", minimum: 1, maximum: 12 },
        childAges: {
          type: "array",
          items: { type: "integer", minimum: 0, maximum: 17 },
          maxItems: 8,
        },
        roomCount: { type: "integer", minimum: 1, maximum: 2 },
      },
      required: ["checkIn", "checkOut", "adults"],
    },
  },
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
