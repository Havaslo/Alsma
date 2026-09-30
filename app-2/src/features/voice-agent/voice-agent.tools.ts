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
      "Вызывай при явной просьбе гостя забронировать или оформить номер, при прямой просьбе соединить с менеджером/оператором либо после явного согласия на предложенный перевод. Просьба оформить номер уже означает согласие на передачу менеджеру; не проверяй наличие и не спрашивай отдельного согласия. Если ты сам предложил перевод по другой причине, дождись ответа: предложение, вопрос или молчание не означают согласие. Перед вызовом полностью закончи короткую фразу «Для оформления соединяю вас с менеджером». При accepted=true не продолжай диалог; при accepted=false сообщи, что сейчас не удалось соединить с менеджером.",
    parameters: {
      type: "object",
      properties: { reason: { type: "string" } },
      required: ["reason"],
    },
  },
] as const;
