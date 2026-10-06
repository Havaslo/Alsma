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
    name: "request_callback",
    description:
      "Создать заявку на обратный звонок, чтобы менеджер перезвонил гостю в рабочее время. Вызывай только после прямой просьбы гостя о перезвоне или его явного согласия оставить заявку. Не переключай и не перенаправляй звонок. Если имя и номер неизвестны, запроси их одним коротким вопросом; если номер звонящего известен, одновременно с именем уточни разрешение перезвонить на него. Не разделяй имя и номер на два запроса. Затем отдельным коротким вопросом уточни удобное время звонка. Не спрашивай повторно уже известные сведения; если гость отказывается или не знает, не настаивай. Передай известную причину и все подтверждённые данные. После успешного сохранения скажи, что менеджер перезвонит в рабочее время; не обещай точное время.",
    parameters: {
      type: "object",
      properties: {
        reason: { type: "string" },
        phone: { type: "string" },
        guestName: { type: "string" },
        preferredTime: { type: "string" },
      },
      required: ["reason"],
    },
  },
] as const;
