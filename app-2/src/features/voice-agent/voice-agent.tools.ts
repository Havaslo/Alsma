export const voiceAgentTools = [
  {
    type: "function",
    name: "check_availability",
    description:
      "Проверить актуальное наличие номеров по датам и составу гостей. Передай уже известные даты, общее число взрослых и количество номеров; не утверждай, что бронь создана.",
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
      "Получить и сравнить актуальные варианты номеров и тарифов по датам и составу гостей. Используй, когда нужно сравнить найденные варианты; сообщай только факты из результата.",
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
      "Вызывай только если гость прямо попросил соединить с менеджером или ясно согласился на твое предложение. Запрос проверить наличие или забронировать номер сам по себе не означает согласие: сначала проверь наличие, сообщи результат, предложи менеджера для оформления и дождись явного согласия. Перед вызовом полностью закончи короткую фразу о соединении. При accepted=true не продолжай диалог; при accepted=false коротко сообщи, что сейчас не удалось соединить.",
    parameters: {
      type: "object",
      properties: { reason: { type: "string" } },
      required: ["reason"],
    },
  },
] as const;
