import type { Logger } from "pino";
import { z } from "zod";

import type { Database } from "../../lib/database/database.js";
import type { EpteraClient } from "../booking/eptera.client.js";
import type { ChatService } from "../chat/chat.service.js";
import { createKnowledgeBaseRepository } from "../knowledge-base/knowledge-base.repository.js";
import { createKnowledgeBaseService } from "../knowledge-base/knowledge-base.service.js";
import { ensureDefaultAgentPlaybook } from "./agent-playbook.js";

const settingsKey = "agent.settings";
const bookingSchema = z.object({
  checkInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOutDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adults: z.number().int().min(1).max(12),
  childAges: z.array(z.number().int().min(0).max(17)).max(8).default([]),
  roomCount: z.number().int().min(1).max(2),
});
const actionSchema = z.object({
  action: z.enum(["answer", "open_page", "create_request", "transfer"]),
  page: z.enum(["spa", "hardware-procedures", "offers"]).optional(),
  name: z.string().trim().max(160).optional(),
  phone: z.string().trim().max(40).optional(),
  email: z.string().trim().max(320).optional(),
  checkInDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  checkOutDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  guestsCount: z.number().int().min(1).max(20).optional(),
  answer: z.string().trim().min(1).max(4_000),
  booking: z.unknown().optional(),
});
type AgentOptions = {
  readonly apiKey?: string;
  readonly baseUrl?: string;
  readonly bookingUrl: string;
  readonly chat: ChatService;
  readonly database: Database;
  readonly eptera: EpteraClient;
  readonly logger: Logger;
};
const asSettings = (value: unknown) => ({
  enabled: true,
  tone: "доброжелательный, спокойный и полезный",
  language: "русский",
  bookingUrl: "",
  canCheckAvailability: true,
  canCreateRequest: true,
  canTransferToEmployee: true,
  showAiDisclosure: true,
  disclosureText: "Я AI-ассистент отеля «Алсма». ",
  ...(value && typeof value === "object" ? value : {}),
  canCreateBooking: false,
});
const normalizeBaseUrl = (value?: string) => (value ?? "").replace(/\/$/u, "");

const monthNumbers: Record<string, string> = {
  января: "01",
  февраля: "02",
  марта: "03",
  апреля: "04",
  мая: "05",
  июня: "06",
  июля: "07",
  августа: "08",
  сентября: "09",
  октября: "10",
  ноября: "11",
  декабря: "12",
};
const monthNames = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
] as const;
const formatFullDate = (value: string) => {
  const [year = "", monthText = "", day = ""] = value.split("-");
  const month = Number(monthText);
  return `${Number(day)} ${monthNames[month - 1] ?? ""} ${year}`;
};

const hasDateInMessage = (text: string) =>
  /\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}\s*(?:[-–]\s*|по\s+)\d{1,2}\s+[а-яё]+(?:\s+\d{4})?/iu.test(
    text,
  );
const asksForOtherDates = (text: string) =>
  /друг(?:ие|их)\s+дат|друг(?:ую|ие)\s+дат|перенести|провер(?:ь|ить)\s+друг/iu.test(
    text,
  );
const serviceMention = (
  text: string,
): "spa" | "hardware-procedures" | "offers" | null => {
  if (/акци|скидк|спецпредлож|выгодн|пакетн.*предлож/iu.test(text))
    return "offers";
  if (/аппаратн|процедур|оздоровлен/iu.test(text)) return "hardware-procedures";
  if (/spa|спа|массаж|хаммам|саун|бассейн/iu.test(text)) return "spa";
  return null;
};

type BookingContext = Partial<z.infer<typeof bookingSchema>> & {
  lastCheckedDates?: string;
  awaitingNewDates?: boolean;
};
type ConversationState = {
  booking?: BookingContext;
  serviceContext?: "spa" | "hardware-procedures" | "offers";
};
const asConversationState = (value: unknown): ConversationState => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const details = value as Record<string, unknown>;
  const bookingValue = details.bookingContext;
  return {
    booking:
      bookingValue &&
      typeof bookingValue === "object" &&
      !Array.isArray(bookingValue)
        ? (bookingValue as BookingContext)
        : undefined,
    serviceContext:
      details.serviceContext === "spa" ||
      details.serviceContext === "hardware-procedures" ||
      details.serviceContext === "offers"
        ? details.serviceContext
        : undefined,
  };
};
const extractEntities = (text: string) => {
  const isoDates = [...text.matchAll(/\b(\d{4}-\d{2}-\d{2})\b/gu)].map(
    (match) => match[1]!,
  );
  const russianRange = [
    ...text.matchAll(
      /(?:с\s*)?(\d{1,2})\s*(?:[-–]\s*|по\s+)(\d{1,2})\s+([а-яё]+)(?:\s+(\d{4}))?/giu,
    ),
  ].at(-1);
  const inferredYear = String(new Date().getFullYear());
  const dates = russianRange
    ? [
        `${russianRange[4] ?? inferredYear}-${monthNumbers[russianRange[3]!.toLocaleLowerCase("ru-RU")] ?? "00"}-${String(Number(russianRange[1]!)).padStart(2, "0")}`,
        `${russianRange[4] ?? inferredYear}-${monthNumbers[russianRange[3]!.toLocaleLowerCase("ru-RU")] ?? "00"}-${String(Number(russianRange[2]!)).padStart(2, "0")}`,
      ]
    : isoDates.slice(-2);
  const adultsMatch = text.match(
    /(?:нас\s+)?(\d{1,2})\s*(?:взросл\w*|человек\w*|гост\w*)/iu,
  );
  const wordAdults = /\b(один|одна|двое|трое|четверо)\b/iu
    .exec(text)?.[1]
    ?.toLocaleLowerCase("ru-RU");
  const adults = adultsMatch
    ? Number(adultsMatch[1])
    : wordAdults
      ? { один: 1, одна: 1, двое: 2, трое: 3, четверо: 4 }[wordAdults]
      : undefined;
  const roomsMatch = text.match(/(\d{1,2})\s*номер\w*/iu);
  const result: BookingContext = {};
  if (dates.length >= 2 && dates.every(Boolean)) {
    result.checkInDate = dates[0];
    result.checkOutDate = dates[1];
    result.awaitingNewDates = false;
  }
  if (adults) result.adults = adults;
  if (roomsMatch) result.roomCount = Number(roomsMatch[1]);
  if (adults && !roomsMatch) result.roomCount = 1;
  return result;
};
const bookingFromContext = (context?: BookingContext) => {
  const parsed = bookingSchema.safeParse(context);
  return parsed.success ? parsed.data : null;
};

export const createAiAgentService = (options: AgentOptions) => {
  const knowledge = createKnowledgeBaseService(
    createKnowledgeBaseRepository(options.database),
  );
  const reply = async (conversationId: string, message: string) => {
    await ensureDefaultAgentPlaybook(options.database);
    const setting = await options.database.client.appSetting.findUnique({
      where: { key: settingsKey },
      select: { value: true },
    });
    const settings = asSettings(setting?.value);
    if (!settings.enabled || !options.apiKey || !options.baseUrl) return null;
    const conversationMessages = (
      await options.chat.list(conversationId)
    ).slice(-20);
    const history = conversationMessages
      .map(
        (item) =>
          `${item.author === "guest" ? "Гость" : item.author === "manager" ? "Менеджер" : "AI-ассистент"}: ${item.text}`,
      )
      .join("\n");
    const requestState = await options.database.client.adminRequest.findUnique({
      where: { id: conversationId },
      select: { details: true },
    });
    const previousState = asConversationState(requestState?.details);
    const currentMessageHasDate = hasDateInMessage(message);
    const requestedOtherDates =
      asksForOtherDates(message) && !currentMessageHasDate;
    const entities = extractEntities(message);
    const nextBooking: BookingContext = requestedOtherDates
      ? {
          ...previousState.booking,
          checkInDate: undefined,
          checkOutDate: undefined,
          lastCheckedDates: undefined,
          awaitingNewDates: true,
        }
      : currentMessageHasDate
        ? { ...previousState.booking, ...entities, lastCheckedDates: undefined }
        : { ...previousState.booking, ...entities };
    const nextServiceContext =
      serviceMention(message) ?? previousState.serviceContext;
    await options.database.client.adminRequest.update({
      where: { id: conversationId },
      data: {
        details: {
          ...(requestState?.details && typeof requestState.details === "object"
            ? requestState.details
            : {}),
          bookingContext: nextBooking,
          serviceContext: nextServiceContext,
        },
      },
    });
    const extractedBooking = bookingFromContext(nextBooking);
    const [knowledgeResult, scenarios, transferRules, knowledgeRules] =
      await Promise.all([
        knowledge.answer({ channel: "text", question: message }),
        options.database.client.agentScenario.findMany({
          where: { enabled: true },
          orderBy: { updatedAt: "desc" },
        }),
        options.database.client.agentTransferRule.findMany({
          where: { enabled: true },
          orderBy: { createdAt: "asc" },
        }),
        options.database.client.agentRule.findMany({
          where: { enabled: true, channels: { has: "text" } },
          orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
        }),
      ]);
    options.chat.publishStatus(conversationId, "composing", "Формирую ответ");
    const context = knowledgeResult.sources
      .map((source) => source.content)
      .join("\n\n")
      .slice(0, 9_000);
    const scenarioContext = scenarios
      .map((item) => `${item.title}: ${item.trigger} => ${item.response}`)
      .join("\n");
    const transferContext = transferRules
      .map((item) => `${item.title}: ${item.condition} => ${item.destination}`)
      .join("\n");
    const knowledgeRuleContext = knowledgeRules
      .map((item) => `${item.title}: ${item.content}`)
      .join("\n");
    const prompt = [
      `Ты AI-ассистент SPA-отеля «Алсма». Тон: ${settings.tone}. Отвечай на ${settings.language}.`,
      "Приветствие уже показано отдельным сообщением интерфейса. Не упоминай, что ты AI-ассистент, не начинай ответ со слова «Здравствуйте» и не добавляй служебное раскрытие в ответ.",
      "Отвечай только по контексту базы знаний и данным наличия. Не выдумывай цены, наличие или условия. Не вставляй статьи базы знаний целиком и не перечисляй внутренний контекст.",
      "Каждый ответ должен продвигать диалог: либо задай один конкретный вопрос, либо предложи одно понятное действие. Не повторяй описание SPA, если оно уже было дано. Если гость выражает общий интерес, сначала предложи выбор из двух-трёх форматов (проживание, SPA на день, процедуры), а не новый список услуг.",
      "Разделяй контексты: проживание хранится отдельно от SPA, процедур и акций. Если тема меняется, не сбрасывай разговор и не повторяй стартовый выбор. Если сервисный контекст уже выбран, сразу отвечай по нему. Если гость спрашивает об акциях, скидках или специальных предложениях, отвечай по базе знаний и используй action open_page с page offers, чтобы показать страницу акций. Для SPA и процедур используй соответствующие страницы. Для проживания собери недостающие параметры и проверь наличие; URL в текст не вставляй.",
      "Не задавай больше одного вопроса за ответ и не возвращайся к уже решённому вопросу. После двух повторов или отсутствия прогресса используй transfer. Если гость просит другие даты без новых дат, это команда начать новый поиск: не повторяй старый результат, не называй старые даты и спроси только новые даты или предложи ближайшие свободные варианты.",
      `Агент может проверить наличие: ${settings.canCheckAvailability}. Может создать заявку: ${settings.canCreateRequest}. Может передать сотруднику: ${settings.canTransferToEmployee}. Самостоятельно создавать бронь запрещено всегда. Не выводи URL и не пиши путь /booking в тексте ответа: если booking подтверждён и варианты найдены, ссылка будет добавлена системой отдельной кнопкой.`,
      "Если данных для заявки не хватает, задай короткий уточняющий вопрос. Для передачи сотруднику используй action transfer. Для перехода на страницу используй action open_page с page spa, hardware-procedures или offers.",
      `Если гость назвал день и месяц без года, подразумевай текущий год ${new Date().getFullYear()}. Перед проверкой обязательно назови гостю полные даты в формате «12 сентября ${new Date().getFullYear()} — 15 сентября ${new Date().getFullYear()}». Преобразуй русские даты вроде «20–22 августа» или «20–22 августа 2026» в ISO YYYY-MM-DD и только так заполняй booking.`,
      "Извлекай из одного сообщения все сущности сразу: даты заезда/выезда, взрослых, детей и количество номеров. Любые новые даты полностью заменяют прежние даты в сохранённом booking-контексте; не спрашивай год, если указан день и месяц — используй текущий год. Если гость явно указал «1 взрослый» и «1 номер» — используй adults: 1 и roomCount: 1, дополнительных вопросов об этих значениях не задавай. Если дети не упомянуты или гость явно сказал, что детей нет, используй childAges: [] и не спрашивай возраст детей. Спрашивай возраст только если дети упомянуты, но их возраст нужен для проверки.",
      "Не придумывай недостающие значения. Заполняй booking только когда даты с подтверждённым годом, взрослые и количество номеров известны; иначе задай один короткий уточняющий вопрос. Если booking заполнен, ответь, что сейчас проверишь варианты.",
      "Верни только JSON без markdown в формате: {action:'answer'|'open_page'|'create_request'|'transfer', page?:'spa'|'hardware-procedures'|'offers', name?, phone?, email?, checkInDate?, checkOutDate?, guestsCount?, booking?:{checkInDate,checkOutDate,adults,childAges,roomCount}, answer:string}. Для open_page page обязателен.",
      `База знаний:\n${context || "Нет подходящей статьи."}`,
      `Сценарии:\n${scenarioContext || "Нет дополнительных сценариев."}`,
      `Правила передачи:\n${transferContext || "Нет дополнительных правил."}`,
      `Активные правила базы знаний:\n${knowledgeRuleContext || "Нет дополнительных правил."}`,
      `Сохранённое состояние диалога:\n${JSON.stringify({ booking: nextBooking, serviceContext: nextServiceContext })}`,
      `История разговора:\n${history || "Нет предыдущих сообщений."}`,
      `Сообщение гостя: ${message}`,
    ]
      .filter(Boolean)
      .join("\n\n");
    const endpoint = `${normalizeBaseUrl(options.baseUrl)}/chat/completions`;
    const request = async (responseFormat?: { readonly type: "json_object" }) =>
      fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${options.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-5.4-mini",
          temperature: 0.2,
          ...(responseFormat ? { response_format: responseFormat } : {}),
          messages: [{ role: "user", content: prompt }],
        }),
        signal: AbortSignal.timeout(20_000),
      });
    const logGatewayFailure = async (response: Response) => {
      const body = (await response.text().catch(() => "")).slice(0, 1_000);
      options.logger.warn(
        {
          gatewayError: body || undefined,
          gatewayStatus: response.status,
          gatewayStatusText: response.statusText,
        },
        "AI Gateway request failed",
      );
    };
    let response: Response;
    try {
      response = await request({ type: "json_object" });
      if (!response.ok) {
        await logGatewayFailure(response);
        response = await request();
      }
    } catch (error) {
      options.logger.warn(
        { error: error instanceof Error ? error.message : "Unknown error" },
        "AI Gateway request could not be completed",
      );
      return null;
    }
    if (!response.ok) {
      await logGatewayFailure(response);
      return null;
    }
    const payload = (await response.json().catch(() => null)) as {
      choices?: Array<{ message?: { content?: string } }>;
    } | null;
    const content = payload?.choices?.[0]?.message?.content?.trim();
    if (!content) return null;
    const jsonContent = content
      .replace(/^```(?:json)?\s*/iu, "")
      .replace(/\s*```$/u, "")
      .trim();
    let decoded: unknown = null;
    try {
      decoded = JSON.parse(jsonContent);
    } catch {
      return null;
    }
    const parsed = actionSchema.safeParse(decoded);
    if (!parsed.success) return null;
    const result = parsed.data;
    if (result.action === "create_request" && settings.canCreateRequest)
      await options.database.client.siteLead.create({
        data: {
          sourcePage: "chat",
          formCode: "ai-agent-request",
          formTitle: "Заявка из AI-чата",
          name: result.name,
          phone: result.phone,
          email: result.email,
          details: {
            conversationId,
            checkInDate: result.checkInDate,
            checkOutDate: result.checkOutDate,
            guestsCount: result.guestsCount,
            comment: message,
            source: "ai-agent",
          },
        },
      });
    let bookingUrl: string | undefined;
    if (result.action === "open_page") {
      bookingUrl =
        result.page === "hardware-procedures" ? "/hardware-procedures" : "/spa";
    }
    let availabilityResult: "available" | "unavailable" | "error" | null = null;
    let availableOfferCount = 0;
    const modelBooking = bookingSchema.safeParse(result.booking);
    const booking =
      requestedOtherDates || nextBooking.awaitingNewDates
        ? bookingSchema.safeParse(undefined)
        : extractedBooking
          ? { success: true as const, data: extractedBooking }
          : modelBooking;
    if (booking.success) {
      options.chat.publishStatus(
        conversationId,
        "checking_availability",
        "Проверяю актуальное наличие номеров",
      );
      try {
        const offers = await options.eptera.getOffers({
          adults: booking.data.adults,
          checkIn: booking.data.checkInDate,
          checkOut: booking.data.checkOutDate,
          childAges: booking.data.childAges,
          currency: "RUB",
          language: "ru",
          nationality: "RU",
          roomCount: booking.data.roomCount,
        });
        const availableOffers = offers.filter(
          (offer) =>
            offer.roomToSell === null ||
            offer.roomToSell >= booking.data.roomCount,
        );
        availableOfferCount = new Set(
          availableOffers.map((offer) => offer.roomTypeId),
        ).size;
        availabilityResult = availableOfferCount ? "available" : "unavailable";
        if (availabilityResult === "available") {
          const base = settings.bookingUrl || options.bookingUrl || "/booking";
          const url = new URL(base, "https://alsma.ru");
          url.search = new URLSearchParams({
            checkIn: booking.data.checkInDate,
            checkOut: booking.data.checkOutDate,
            adults: String(booking.data.adults),
            childAges: booking.data.childAges.join(","),
            roomCount: String(booking.data.roomCount),
          }).toString();
          bookingUrl = /^https?:/u.test(base)
            ? url.toString()
            : url.pathname + url.search;
        }
      } catch {
        availabilityResult = "error";
        bookingUrl = undefined;
      }
    }
    if (booking.success && availabilityResult) {
      await options.database.client.adminRequest.update({
        where: { id: conversationId },
        data: {
          details: {
            ...(requestState?.details &&
            typeof requestState.details === "object"
              ? requestState.details
              : {}),
            bookingContext: {
              ...nextBooking,
              ...booking.data,
              lastCheckedDates: `${booking.data.checkInDate}/${booking.data.checkOutDate}`,
              awaitingNewDates: false,
            },
            serviceContext: nextServiceContext,
          },
        },
      });
    }
    const transferNotice =
      "Я передал диалог сотруднику — он подключится к вам.";
    const answerWithTransfer =
      result.action === "transfer" &&
      settings.canTransferToEmployee &&
      !result.answer.includes(transferNotice)
        ? `${result.answer} ${transferNotice}`
        : result.answer;
    const withoutDisclosure = answerWithTransfer
      .replace(
        /В этом чате отвечает AI-ассистент\.\s*При необходимости подключим сотрудника\.\s*/iu,
        "",
      )
      .replace(/^Здравствуйте!\s*/iu, "")
      .replace(/\/?booking(?:\?[^\s]*)?/giu, "после уточнения параметров")
      .trim();
    const guestSafeAnswer = withoutDisclosure
      .replace(/\bEptera(?:\s+Booking\s+API)?\b/giu, "система бронирования")
      .replace(/\bЭптера\b/giu, "система бронирования")
      .trim();
    let answer =
      guestSafeAnswer || "Подскажите, пожалуйста, чем я могу помочь?";
    if (requestedOtherDates && result.action !== "transfer") {
      answer =
        "Назовите, пожалуйста, новые даты заезда и выезда — я проверю актуальное наличие.";
    }
    if (booking.success && availabilityResult) {
      const dateRange = `${formatFullDate(booking.data.checkInDate)} — ${formatFullDate(booking.data.checkOutDate)}`;
      if (availabilityResult === "available") {
        answer = `На даты ${dateRange} найдено подходящих вариантов номеров: ${availableOfferCount}. Откройте подборку по кнопке ниже.`;
      } else if (availabilityResult === "unavailable") {
        answer = `На даты ${dateRange} свободных номеров не найдено. Могу проверить другие даты или передать вопрос менеджеру.`;
      } else {
        answer = `Не удалось получить актуальное наличие на даты ${dateRange}. Попробуйте ещё раз или я передам вопрос сотруднику.`;
      }
    }
    const finalAction =
      availabilityResult === "error" ? "transfer" : result.action;
    await options.chat.publish(conversationId, "agent", answer, bookingUrl);
    return { action: finalAction, answer };
  };
  return { reply };
};
export type AiAgentService = ReturnType<typeof createAiAgentService>;
