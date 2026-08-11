import type { Logger } from "pino";
import { z } from "zod";

import type { Database } from "../../lib/database/database.js";
import type { EpteraClient } from "../booking/eptera.client.js";
import type { ChatService } from "../chat/chat.service.js";
import { createKnowledgeBaseRepository } from "../knowledge-base/knowledge-base.repository.js";
import { createKnowledgeBaseService } from "../knowledge-base/knowledge-base.service.js";

const settingsKey = "agent.settings";
const bookingSchema = z.object({
  checkInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOutDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adults: z.number().int().min(1).max(12),
  childAges: z.array(z.number().int().min(0).max(17)).max(8).default([]),
  roomCount: z.number().int().min(1).max(2),
});
const actionSchema = z.object({
  action: z.enum(["answer", "create_request", "transfer"]),
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

export const createAiAgentService = (options: AgentOptions) => {
  const knowledge = createKnowledgeBaseService(
    createKnowledgeBaseRepository(options.database),
  );
  const reply = async (conversationId: string, message: string) => {
    const setting = await options.database.client.appSetting.findUnique({
      where: { key: settingsKey },
      select: { value: true },
    });
    const settings = asSettings(setting?.value);
    if (!settings.enabled || !options.apiKey || !options.baseUrl) return null;
    const history = options.chat
      .list(conversationId)
      .slice(-12)
      .map(
        (item) =>
          `${item.author === "guest" ? "Гость" : "Ассистент"}: ${item.text}`,
      )
      .join("\n");
    const [knowledgeResult, scenarios, transferRules] = await Promise.all([
      knowledge.answer({ channel: "text", question: message }),
      options.database.client.agentScenario.findMany({
        where: { enabled: true },
        orderBy: { updatedAt: "desc" },
      }),
      options.database.client.agentTransferRule.findMany({
        where: { enabled: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);
    const dates = message.match(/\d{4}-\d{2}-\d{2}/gu) ?? [];
    const guests = message.match(
      /(?:гост\w*|челов\w*|взросл\w*)\D{0,8}(\d{1,2})/iu,
    );
    let availability = "";
    if (settings.canCheckAvailability && dates.length >= 2 && guests) {
      try {
        const offers = await options.eptera.getOffers({
          adults: Math.max(1, Number(guests[1])),
          checkIn: dates[0] ?? "",
          checkOut: dates[1] ?? "",
          childAges: [],
          currency: "RUB",
          language: "ru",
          nationality: "RU",
          roomCount: 1,
        });
        availability = `\nАктуальная проверка Eptera: найдено вариантов ${offers.filter((offer) => offer.roomToSell > 0).length}.`;
      } catch {
        availability =
          "\nАктуальная проверка Eptera сейчас недоступна; не утверждай наличие.";
      }
    }
    const context = (
      knowledgeResult.sources.map((source) => source.content).join("\n\n") +
      availability
    ).slice(0, 9_000);
    const scenarioContext = scenarios
      .map((item) => `${item.title}: ${item.trigger} => ${item.response}`)
      .join("\n");
    const transferContext = transferRules
      .map((item) => `${item.title}: ${item.condition} => ${item.destination}`)
      .join("\n");
    const prompt = [
      `Ты AI-ассистент SPA-отеля «Алсма». Тон: ${settings.tone}. Отвечай на ${settings.language}.`,
      "Приветствие уже показано отдельным сообщением интерфейса. Не упоминай, что ты AI-ассистент, не начинай ответ со слова «Здравствуйте» и не добавляй служебное раскрытие в ответ.",
      "Отвечай только по контексту базы знаний и данным наличия. Не выдумывай цены, наличие или условия. Не вставляй статьи базы знаний целиком и не перечисляй внутренний контекст; сформулируй короткий прямой ответ именно на вопрос гостя. Если в контексте нет ответа, честно скажи об этом и предложи помощь сотрудника.",
      `Агент может проверить наличие: ${settings.canCheckAvailability}. Может создать заявку: ${settings.canCreateRequest}. Может передать сотруднику: ${settings.canTransferToEmployee}. Самостоятельно создавать бронь запрещено всегда. Не выводи URL и не пиши путь /booking в тексте ответа: если booking подтверждён и варианты найдены, ссылка будет добавлена системой отдельной кнопкой.`,
      "Если данных для заявки не хватает, задай короткий уточняющий вопрос. Для передачи сотруднику используй action transfer.",
      "Для ссылки на бронирование сначала собери и проверь даты заезда/выезда, общее число взрослых, возраст детей и количество номеров. Не придумывай недостающие значения. Заполняй booking только когда все параметры явно названы гостем или подтверждены им; иначе задай уточняющий вопрос. Если booking заполнен, ответь, что сейчас проверишь варианты.",
      "Верни только JSON без markdown в формате: {action:'answer'|'create_request'|'transfer', name?, phone?, email?, checkInDate?, checkOutDate?, guestsCount?, booking?:{checkInDate,checkOutDate,adults,childAges,roomCount}, answer:string}.",
      `База знаний:\n${context || "Нет подходящей статьи."}`,
      `Сценарии:\n${scenarioContext || "Нет дополнительных сценариев."}`,
      `Правила передачи:\n${transferContext || "Нет дополнительных правил."}`,
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
    const booking = bookingSchema.safeParse(result.booking);
    if (booking.success) {
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
        if (
          offers.some((offer) => offer.roomToSell >= booking.data.roomCount)
        ) {
          const base = settings.bookingUrl || options.bookingUrl;
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
        bookingUrl = undefined;
      }
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
    const answer =
      withoutDisclosure || "Подскажите, пожалуйста, чем я могу помочь?";
    options.chat.publish(conversationId, "manager", answer, bookingUrl);
    return { action: result.action, answer };
  };
  return { reply };
};
export type AiAgentService = ReturnType<typeof createAiAgentService>;
