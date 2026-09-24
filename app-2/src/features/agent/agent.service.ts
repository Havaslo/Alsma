import type { Logger } from "pino";
import { z } from "zod";

import type { Database } from "../../lib/database/database.js";
import type { BookingService } from "../booking/booking.service.js";
import type { ChatService } from "../chat/chat.service.js";
import { createKnowledgeBaseRepository } from "../knowledge-base/knowledge-base.repository.js";
import { createKnowledgeBaseService } from "../knowledge-base/knowledge-base.service.js";
import { loadPublishedEventsContext } from "../voice-agent/events-context.js";
import {
  agentBookingSchema,
  formatEpteraOffersForAgent,
  isExplicitBookingConfirmation,
  normalizeAgentOfferSummaries,
  summarizeEpteraOffers,
  toReservationBody,
} from "./agent-booking.js";
import { DEFAULT_AGENT_GLOBAL_INSTRUCTIONS } from "./agent-instructions.js";
import { ensureDefaultAgentPlaybook } from "./agent-playbook.js";
import { createAgentGatewayClient } from "./agent.gateway.js";
import { loadPublishedOffersContext } from "./offers-context.js";

const settingsKey = "agent.settings";
const bookingSchema = z.object({
  checkInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOutDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adults: z.number().int().min(1).max(12),
  childAges: z.array(z.number().int().min(0).max(17)).max(8).default([]),
  roomCount: z.number().int().min(1).max(2),
});
const actionSchema = z.object({
  action: z.enum([
    "answer",
    "open_page",
    "check_availability",
    "create_booking",
    "create_request",
    "transfer",
  ]),
  confirmed: z.boolean().optional(),
  page: z
    .enum([
      "about",
      "all-inclusive",
      "celebrations",
      "entertainment",
      "faq",
      "hardware-procedures",
      "offers",
      "rooms",
      "spa",
    ])
    .optional(),
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
  offerId: z.string().trim().min(1).max(300).optional(),
  answer: z.string().trim().min(1).max(4_000),
  booking: z.unknown().optional(),
});
const agentPageRoutes = {
  about: "/about",
  "all-inclusive": "/all-inclusive",
  celebrations: "/celebrations",
  entertainment: "/entertainment",
  faq: "/faq",
  "hardware-procedures": "/hardware-procedures",
  offers: "/offers",
  rooms: "/rooms",
  spa: "/spa",
} as const;
const parseAgentCompletion = (content: string) => {
  const jsonContent = content
    .replace(/^```(?:json)?\s*/iu, "")
    .replace(/\s*```$/u, "")
    .trim();
  try {
    const parsed = actionSchema.safeParse(JSON.parse(jsonContent));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};
const isAgentPage = (value: unknown): value is keyof typeof agentPageRoutes =>
  typeof value === "string" && Object.hasOwn(agentPageRoutes, value);
type AgentOptions = {
  readonly apiKey?: string;
  readonly baseUrl?: string;
  readonly bookingUrl: string;
  readonly bookingReturnUrl?: string;
  readonly booking: BookingService;
  readonly chat: ChatService;
  readonly database: Database;
  readonly logger: Logger;
};
const asSettings = (value: unknown) => ({
  enabled: true,
  site: true,
  voice: true,
  vk: true,
  max: true,
  tone: "обходительный, вежливый, дружелюбный и уважительный",
  language: "русский",
  globalInstructions: DEFAULT_AGENT_GLOBAL_INSTRUCTIONS,
  bookingUrl: "",
  canCheckAvailability: true,
  canCreateRequest: true,
  canTransferToEmployee: true,
  showAiDisclosure: true,
  disclosureText: "Я AI-ассистент отеля «Алсма». ",
  ...(value && typeof value === "object" ? value : {}),
  canCreateBooking: true,
});
const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

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
const hasDateInMessage = (text: string) =>
  /\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}\s*(?:[-–]\s*|по\s+)\d{1,2}\s+[а-яё]+(?:\s+\d{4})?/iu.test(
    text,
  );
const calendarDateInMessage = (text: string): string | undefined => {
  const iso = text.match(/\b(\d{4}-\d{2}-\d{2})\b/u)?.[1];
  if (iso) return iso;
  const match = text.match(/\b(\d{1,2})\s+([а-яё]+)(?:\s+(\d{4}))?\b/iu);
  if (!match?.[1] || !match[2]) return undefined;
  const month = monthNumbers[match[2].toLocaleLowerCase("ru-RU")];
  return month
    ? `${match[3] ?? new Date().getFullYear()}-${month}-${String(Number(match[1])).padStart(2, "0")}`
    : undefined;
};
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
  offerId?: string;
  lastCheckedDates?: string;
  awaitingNewDates?: boolean;
};
type BookingContact = {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
};
type ConversationState = {
  booking?: BookingContext;
  availabilityOffers?: ReturnType<typeof summarizeEpteraOffers>;
  serviceContext?: "spa" | "hardware-procedures" | "offers";
  contactRequest?: {
    awaitingChoice?: boolean;
    awaitingContacts?: boolean;
    email?: string;
    name?: string;
    phone?: string;
    created?: boolean;
  };
  bookingContact?: BookingContact;
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
    availabilityOffers: Array.isArray(details.availabilityOffers)
      ? normalizeAgentOfferSummaries(
          details.availabilityOffers.filter(
            (item): item is ReturnType<typeof summarizeEpteraOffers>[number] =>
              Boolean(item && typeof item === "object" && "id" in item),
          ),
        )
      : undefined,
    serviceContext:
      details.serviceContext === "spa" ||
      details.serviceContext === "hardware-procedures" ||
      details.serviceContext === "offers"
        ? details.serviceContext
        : undefined,
    contactRequest:
      details.contactRequest &&
      typeof details.contactRequest === "object" &&
      !Array.isArray(details.contactRequest)
        ? (details.contactRequest as ConversationState["contactRequest"])
        : undefined,
    bookingContact:
      details.bookingContact &&
      typeof details.bookingContact === "object" &&
      !Array.isArray(details.bookingContact)
        ? (details.bookingContact as BookingContact)
        : undefined,
  };
};
const isBookingRequest = (message: string, booking?: BookingContext) =>
  Boolean(
    booking?.checkInDate ||
    booking?.checkOutDate ||
    booking?.adults ||
    booking?.roomCount ||
    /брон|засел|прожив|даты?\s+(?:заезда|проживания)/iu.test(message),
  );
const phoneFromText = (text: string) =>
  text
    .match(/(?:\+?7|8)[\s(\-]*\d[\d\s()\-]{8,}\d/iu)?.[0]
    ?.replace(/[^\d+]/gu, "");
const emailFromText = (text: string) =>
  text.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/iu)?.[0]?.toLowerCase();
const contactNamePartsFromText = (text: string): BookingContact => {
  const firstName = text.match(
    /(?:^|[\s;,/])имя\s*[:—-]\s*([А-ЯЁ][а-яё-]{2,39})/iu,
  )?.[1];
  const lastName = text.match(
    /(?:^|[\s;,/])фамили(?:я|ю)\s*[:—-]\s*([А-ЯЁ][а-яё-]{2,39})/iu,
  )?.[1];
  if (firstName || lastName) {
    return {
      ...(firstName ? { firstName } : {}),
      ...(lastName ? { lastName } : {}),
    };
  }
  const labeled = text.match(
    /(?:меня\s+зовут|это)\s+([А-ЯЁ][а-яё-]{2,39})(?:\s+([А-ЯЁ][а-яё-]{2,39}))?/iu,
  );
  if (labeled?.[1]) {
    return {
      firstName: labeled[1],
      ...(labeled[2] ? { lastName: labeled[2] } : {}),
    };
  }
  const contactLine = text.match(
    /^\s*([А-ЯЁ][а-яё-]{2,39})(?:\s+([А-ЯЁ][а-яё-]{2,39}))?\s*(?=,|;|$|\bтел(?:ефон|\.)?\b|\bemail\b|\bпочт)/u,
  );
  return contactLine?.[1]
    ? {
        firstName: contactLine[1],
        ...(contactLine[2] ? { lastName: contactLine[2] } : {}),
      }
    : {};
};
const nameFromText = (text: string) => {
  const parts = contactNamePartsFromText(text);
  return (
    [parts.firstName, parts.lastName].filter(Boolean).join(" ") || undefined
  );
};
const splitName = (value?: string) => {
  const parts = value?.trim().split(/\s+/u).filter(Boolean) ?? [];
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" ") || undefined,
  };
};
const missingBookingContactFields = (contact: BookingContact) => {
  const missing: string[] = [];
  if (!contact.firstName) missing.push("имя");
  if (!contact.lastName) missing.push("фамилию");
  if (!contact.phone) missing.push("номер телефона");
  if (!contact.email) missing.push("email");
  return missing;
};
const hasBookingContactData = (contact: BookingContact) =>
  Boolean(
    contact.firstName || contact.lastName || contact.phone || contact.email,
  );
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
  const dates =
    isoDates.length >= 2
      ? isoDates.slice(-2)
      : russianRange
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
  const childMention = /реб[её]н|дет(?:и|ей|ям|ьми)|малыш/iu.test(text);
  const childAges = childMention
    ? [...text.matchAll(/\b(\d{1,2})\s*(?:лет|года?|годик\w*)\b/giu)]
        .map((match) => Number(match[1]))
        .filter((age) => age >= 0 && age <= 17)
        .slice(0, 8)
    : undefined;
  const result: BookingContext = {};
  if (dates.length >= 2 && dates.every(Boolean)) {
    result.checkInDate = dates[0];
    result.checkOutDate = dates[1];
    result.awaitingNewDates = false;
  }
  if (adults) result.adults = adults;
  if (roomsMatch) result.roomCount = Number(roomsMatch[1]);
  if (adults && !roomsMatch) result.roomCount = 1;
  if (childAges) result.childAges = childAges;
  return result;
};
const bookingFromContext = (context?: BookingContext) => {
  const parsed = bookingSchema.safeParse(context);
  return parsed.success ? parsed.data : null;
};
const normalizedOfferLabel = (value: string) =>
  value
    .replace(/[«»"']/gu, "")
    .replace(/\s+/gu, " ")
    .trim()
    .toLocaleLowerCase("ru-RU");
const findOfferMentionedByGuest = (
  message: string,
  offers: ReturnType<typeof summarizeEpteraOffers>,
) => {
  const normalizedMessage = normalizedOfferLabel(message);
  return [
    ...new Map(
      offers.map((offer) => [normalizedOfferLabel(offer.roomType), offer]),
    ).values(),
  ]
    .sort((left, right) => right.roomType.length - left.roomType.length)
    .find((offer) =>
      normalizedMessage.includes(normalizedOfferLabel(offer.roomType)),
    );
};
export const createAiAgentService = (options: AgentOptions) => {
  const knowledge = createKnowledgeBaseService(
    createKnowledgeBaseRepository(options.database),
  );
  const completeWithGateway = createAgentGatewayClient(options);
  const conversationQueues = new Map<string, Promise<void>>();
  const saveAgentRequest = async (input: {
    conversationId: string;
    currentDetails: unknown;
    message: string;
    history: string;
    contactRequest?: ConversationState["contactRequest"];
    booking?: BookingContext;
    name?: string;
    phone?: string;
    email?: string;
  }) => {
    const existingDetails =
      input.currentDetails &&
      typeof input.currentDetails === "object" &&
      !Array.isArray(input.currentDetails)
        ? (input.currentDetails as Record<string, unknown>)
        : {};
    const bookingRequest = isBookingRequest(input.message, input.booking);
    const contact = input.phone ?? input.contactRequest?.phone;
    const name = input.name ?? input.contactRequest?.name;
    const details = {
      ...existingDetails,
      source: existingDetails.source === "Сайт" ? "Сайт" : "AI-agent",
      channelType: "chat",
      conversationId: input.conversationId,
      requestType: bookingRequest ? "booking" : "agent-contact",
      agentRequestCreated: true,
      ...(input.contactRequest ? { contactRequest: input.contactRequest } : {}),
      collectedContext: {
        ...(input.booking ? { booking: input.booking } : {}),
        ...(input.contactRequest
          ? { contactRequest: input.contactRequest }
          : {}),
      },
    };
    const guestMessages = input.history
      .split("\n")
      .filter((line) => line.startsWith("Гость:"))
      .map((line) => line.replace(/^Гость:\s*/u, "").trim());
    const originalRequest = guestMessages[0] ?? input.message;
    const collectedParameters = input.booking
      ? Object.entries(input.booking)
          .filter(
            ([key, value]) => value !== undefined && key !== "lastCheckedDates",
          )
          .map(
            ([key, value]) =>
              `${key}: ${Array.isArray(value) ? value.join(", ") : value}`,
          )
          .join(", ")
      : "не указаны";
    const description = [
      `Запрос гостя: ${originalRequest}`,
      `Контакты: ${name ?? "имя не указано"}, ${contact ?? "телефон не указан"}`,
      `Параметры бронирования: ${collectedParameters}`,
    ].join("\n");
    await options.database.client.adminRequest.update({
      where: { id: input.conversationId },
      data: {
        title: bookingRequest
          ? "Заявка на бронирование из AI-чата"
          : "Заявка агента: связь с гостем",
        category: bookingRequest ? "booking" : "AI-agent",
        requester: name || undefined,
        contact: contact || undefined,
        description,
        details,
      },
    });
    if (bookingRequest && name && contact) {
      const existingBooking =
        await options.database.client.bookingRequest.findFirst({
          where: { adminRequestId: input.conversationId },
          select: { id: true },
        });
      if (!existingBooking) {
        await options.database.client.bookingRequest.create({
          data: {
            adminRequestId: input.conversationId,
            guestName: name,
            phone: contact,
            email: input.email ?? null,
            checkInDate: input.booking?.checkInDate
              ? new Date(`${input.booking.checkInDate}T00:00:00Z`)
              : null,
            checkOutDate: input.booking?.checkOutDate
              ? new Date(`${input.booking.checkOutDate}T00:00:00Z`)
              : null,
            guestsCount: input.booking?.adults ?? 1,
            roomName: null,
          },
        });
      }
    }
  };
  const replyNow = async (
    conversationId: string,
    message: string,
    channel: "site" | "vk" | "max" = "site",
  ) => {
    await ensureDefaultAgentPlaybook(options.database);
    const setting = await options.database.client.appSetting.findUnique({
      where: { key: settingsKey },
      select: { value: true },
    });
    const settings = asSettings(setting?.value);
    if (
      !settings.enabled ||
      !settings[channel] ||
      !options.apiKey ||
      !options.baseUrl
    )
      return null;
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
    const previousContactRequest = previousState.contactRequest ?? {};
    const previousBookingContact = previousState.bookingContact ?? {};
    const currentPhone = phoneFromText(message);
    const currentEmail = emailFromText(message);
    const currentName = nameFromText(message);
    const detectedPhone = currentPhone ?? previousContactRequest.phone;
    const detectedName = currentName ?? previousContactRequest.name;
    const detectedEmail = currentEmail ?? previousContactRequest.email;
    const historicalBookingContact = conversationMessages
      .filter((item) => item.author === "guest")
      .map((item) => ({
        name: contactNamePartsFromText(item.text),
        phone: phoneFromText(item.text),
        email: emailFromText(item.text),
      }))
      .reduce<BookingContact>(
        (contact, item) => ({
          ...contact,
          ...item.name,
          ...(item.phone ? { phone: item.phone } : {}),
          ...(item.email ? { email: item.email } : {}),
        }),
        {},
      );
    const legacyContactName = contactNamePartsFromText(
      previousContactRequest.name ?? "",
    );
    const currentNameParts = contactNamePartsFromText(message);
    const nextBookingContact: BookingContact = {
      ...previousBookingContact,
      ...historicalBookingContact,
      ...legacyContactName,
      ...currentNameParts,
      ...(currentPhone ? { phone: currentPhone } : {}),
      ...(currentEmail ? { email: currentEmail } : {}),
    };
    const contactRequestDetails = {
      ...(detectedName ? { name: detectedName } : {}),
      ...(detectedPhone ? { phone: detectedPhone } : {}),
      ...(detectedEmail ? { email: detectedEmail } : {}),
    };
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
    const nextAvailabilityOffers = requestedOtherDates
      ? undefined
      : previousState.availabilityOffers;
    await options.database.client.adminRequest.update({
      where: { id: conversationId },
      data: {
        details: {
          ...(requestState?.details && typeof requestState.details === "object"
            ? requestState.details
            : {}),
          bookingContext: nextBooking,
          ...(nextAvailabilityOffers
            ? { availabilityOffers: nextAvailabilityOffers }
            : {}),
          serviceContext: nextServiceContext,
          ...(Object.keys(contactRequestDetails).length
            ? { contactRequest: contactRequestDetails }
            : {}),
          ...(hasBookingContactData(nextBookingContact)
            ? { bookingContact: nextBookingContact }
            : {}),
        },
      },
    });
    let availabilityOffers = nextAvailabilityOffers ?? [];
    const bookingConfirmationMessage = isExplicitBookingConfirmation(message);
    const isBookingContactMessage = Boolean(
      currentName ||
      currentPhone ||
      currentEmail ||
      (bookingConfirmationMessage && isBookingRequest(message, nextBooking)),
    );
    const knowledgeResult = isBookingContactMessage
      ? { sources: [] as Array<{ content: string }> }
      : await knowledge.answer({ channel: "text", question: message });
    const [offersContext, eventsContext] = await Promise.all([
      loadPublishedOffersContext(options.database),
      loadPublishedEventsContext(
        options.database,
        calendarDateInMessage(message),
      ).catch(() => ""),
    ]);
    options.chat.publishStatus(conversationId, "composing", "Формирую ответ");
    const context = knowledgeResult.sources
      .map((source) => source.content)
      .join("\n\n")
      .slice(0, 9_000);
    const asksOfferDetails =
      /сравн|тариф|питан|услов|отмен|включен|услуг|подроб|отлич(?:а|ие)|комфорт|балкон|кроват/iu.test(
        message,
      );
    const globalInstructions = [
      settings.globalInstructions.trim() || DEFAULT_AGENT_GLOBAL_INSTRUCTIONS,
      `Доступные инструменты: проверка наличия номеров через Eptera (${settings.canCheckAvailability}), создание брони (${settings.canCreateBooking}), регистрация обращения (${settings.canCreateRequest}), запрос подключения сотрудника (${settings.canTransferToEmployee}) и ссылки на страницы сайта.`,
      "Выбирай инструмент самостоятельно по контексту разговора. После результата инструмента сформулируй для гостя естественный ответ; не подменяй ответ готовой репликой и не утверждай, что действие завершено, пока его результат не подтверждён.",
      "Технический формат ответа: верни только JSON без markdown: {action:'answer'|'open_page'|'check_availability'|'create_booking'|'create_request'|'transfer', confirmed?:boolean, offerId?, page?:'about'|'all-inclusive'|'celebrations'|'entertainment'|'faq'|'hardware-procedures'|'offers'|'rooms'|'spa', name?, phone?, email?, checkInDate?, checkOutDate?, guestsCount?, booking?:{checkInDate,checkOutDate,adults,childAges,roomCount,offerId,firstName,lastName,phone,email,paymentMethod,guests?}, answer:string}. Для open_page укажи page; для check_availability передай параметры в booking.",
    ].join("\n\n");
    const userInput = [
      `База знаний:\n${context || "Нет подходящей статьи."}`,
      `Опубликованные акции:\n${offersContext || "Нет опубликованных акций."}`,
      `Опубликованные мероприятия${calendarDateInMessage(message) ? ` на ${calendarDateInMessage(message)}` : ""}:\n${eventsContext || "Нет данных из публичного календаря."}`,
      `Текущие данные и результаты поиска Eptera:\n${formatEpteraOffersForAgent(availabilityOffers, asksOfferDetails) || "Подтверждённые варианты ещё не проверялись."}`,
      `Уже известные контакты для брони: ${JSON.stringify(nextBookingContact)}. Контакты для заявки: ${JSON.stringify(contactRequestDetails)}.`,
      `Состояние диалога: ${JSON.stringify({ availabilityOffers, booking: nextBooking, serviceContext: nextServiceContext })}`,
      `История разговора:\n${history || "Нет предыдущих сообщений."}`,
      `Сообщение гостя: ${message}`,
    ]
      .filter(Boolean)
      .join("\n\n");
    const content = await completeWithGateway({
      instructions: globalInstructions,
      input: userInput,
    });
    if (!content) return null;
    const result = parseAgentCompletion(content);
    if (!result) return null;
    const requestedBooking = bookingSchema.safeParse(result.booking);
    const effectiveAction = result.action;
    const effectivePage = result.page;
    const bookingCandidate =
      result.booking &&
      typeof result.booking === "object" &&
      !Array.isArray(result.booking)
        ? (result.booking as Record<string, unknown>)
        : {};
    const confirmationReceived = bookingConfirmationMessage;
    const modelOfferId =
      typeof bookingCandidate.offerId === "string"
        ? bookingCandidate.offerId
        : result.offerId;
    const storedOffer = nextBooking.offerId
      ? availabilityOffers.find((offer) => offer.id === nextBooking.offerId)
      : undefined;
    const modelOffer = modelOfferId
      ? availabilityOffers.find((offer) => offer.id === modelOfferId)
      : undefined;
    const mentionedOffer =
      !currentMessageHasDate && !confirmationReceived
        ? findOfferMentionedByGuest(message, availabilityOffers)
        : undefined;
    // Once the guest confirms, the server-side state is authoritative. The
    // model may repeat a room name such as "Стандарт" instead of the exact
    // Eptera offer id, or may return a malformed booking object.
    const selectedOffer = confirmationReceived
      ? (storedOffer ?? modelOffer ?? mentionedOffer)
      : (modelOffer ?? mentionedOffer ?? storedOffer);
    const requestedOfferId = selectedOffer?.id;
    let bookingState = requestedOfferId
      ? { ...nextBooking, offerId: requestedOfferId }
      : nextBooking;
    const candidateBookingNames = splitName(
      typeof bookingCandidate.firstName === "string" &&
        typeof bookingCandidate.lastName === "string"
        ? `${bookingCandidate.firstName} ${bookingCandidate.lastName}`
        : (result.name ?? detectedName),
    );
    const effectiveBookingContact: BookingContact = {
      ...nextBookingContact,
      ...(nextBookingContact.firstName || !candidateBookingNames.firstName
        ? {}
        : { firstName: candidateBookingNames.firstName }),
      ...(nextBookingContact.lastName || !candidateBookingNames.lastName
        ? {}
        : { lastName: candidateBookingNames.lastName }),
      ...(nextBookingContact.phone || typeof bookingCandidate.phone !== "string"
        ? {}
        : { phone: bookingCandidate.phone }),
      ...(nextBookingContact.email || typeof bookingCandidate.email !== "string"
        ? {}
        : { email: bookingCandidate.email }),
      ...(nextBookingContact.email || typeof result.email !== "string"
        ? {}
        : { email: result.email }),
    };
    if (hasBookingContactData(effectiveBookingContact) || requestedOfferId) {
      await options.database.client.adminRequest.update({
        where: { id: conversationId },
        data: {
          details: {
            ...(requestState?.details &&
            typeof requestState.details === "object"
              ? requestState.details
              : {}),
            ...(availabilityOffers.length ? { availabilityOffers } : {}),
            bookingContext: bookingState,
            bookingContact: effectiveBookingContact,
            serviceContext: nextServiceContext,
          },
        },
      });
    }
    const missingContactFields = missingBookingContactFields(
      effectiveBookingContact,
    );
    const canCompleteBooking = Boolean(
      settings.canCreateBooking &&
      confirmationReceived &&
      bookingFromContext(bookingState) &&
      selectedOffer &&
      missingContactFields.length === 0,
    );
    let finalAction = effectiveAction;
    let bookingUrl: string | undefined;
    let actionOutcome: Record<string, unknown> | undefined;
    if (finalAction === "check_availability") {
      finalAction = "answer";
      const searchCriteria = requestedBooking.success
        ? requestedBooking.data
        : bookingFromContext(nextBooking);
      if (!settings.canCheckAvailability) {
        actionOutcome = {
          tool: "check_availability",
          status: "unavailable",
        };
      } else if (!searchCriteria) {
        actionOutcome = {
          tool: "check_availability",
          status: "not_performed",
          missingParameters: [
            "checkInDate",
            "checkOutDate",
            "adults",
            "roomCount",
          ],
        };
      } else {
        options.chat.publishStatus(
          conversationId,
          "checking_availability",
          "Проверяю доступные варианты",
        );
        const search = {
          adults: searchCriteria.adults,
          checkIn: searchCriteria.checkInDate,
          checkOut: searchCriteria.checkOutDate,
          childAges: searchCriteria.childAges,
          children: searchCriteria.childAges.length,
          currency: "RUB",
          language: "ru",
          nationality: "RU",
          roomCount: searchCriteria.roomCount,
        };
        try {
          let resultOffers: ReturnType<typeof summarizeEpteraOffers> = [];
          for (let attempt = 0; attempt < 2; attempt += 1) {
            const searchResult = await options.booking.offers(search);
            resultOffers = summarizeEpteraOffers(searchResult.offers);
            if (resultOffers.length > 0 || attempt === 1) break;
            options.chat.publishStatus(
              conversationId,
              "checking_availability",
              "Получаю подтверждённые варианты",
            );
            await wait(500);
          }
          availabilityOffers = resultOffers;
          bookingState = {
            ...searchCriteria,
            lastCheckedDates: `${searchCriteria.checkInDate}/${searchCriteria.checkOutDate}`,
            awaitingNewDates: false,
          };
          await options.database.client.adminRequest.update({
            where: { id: conversationId },
            data: {
              details: {
                ...(requestState?.details &&
                typeof requestState.details === "object"
                  ? requestState.details
                  : {}),
                availabilityOffers,
                bookingContext: bookingState,
                serviceContext: nextServiceContext,
                ...(Object.keys(contactRequestDetails).length
                  ? { contactRequest: contactRequestDetails }
                  : {}),
                ...(hasBookingContactData(nextBookingContact)
                  ? { bookingContact: nextBookingContact }
                  : {}),
              },
            },
          });
          actionOutcome = {
            tool: "check_availability",
            status: "completed",
            checkInDate: searchCriteria.checkInDate,
            checkOutDate: searchCriteria.checkOutDate,
            optionsFound: availabilityOffers.length,
            verifiedOptions:
              formatEpteraOffersForAgent(availabilityOffers, true) ||
              "Подтверждённые варианты на эти даты не найдены.",
          };
        } catch {
          options.logger.warn(
            { conversationId },
            "Eptera availability lookup for chat agent failed",
          );
          actionOutcome = {
            tool: "check_availability",
            status: "failed",
          };
        }
      }
    }
    if (finalAction === "create_booking") {
      const bookingData = agentBookingSchema.safeParse({
        adults: bookingState.adults,
        checkInDate: bookingState.checkInDate,
        checkOutDate: bookingState.checkOutDate,
        childAges: bookingState.childAges ?? [],
        email: effectiveBookingContact.email,
        firstName: effectiveBookingContact.firstName,
        lastName: effectiveBookingContact.lastName,
        offerId: selectedOffer?.id ?? bookingState.offerId,
        paymentMethod:
          bookingCandidate.paymentMethod === "first_night"
            ? "first_night"
            : "full",
        phone: effectiveBookingContact.phone,
        roomCount: bookingState.roomCount,
      });
      const returnUrl =
        options.bookingReturnUrl ??
        (/^https?:\/\//iu.test(settings.bookingUrl)
          ? new URL("/booking/return", settings.bookingUrl).toString()
          : undefined);
      const bookingFailure = !settings.canCreateBooking
        ? "booking_disabled"
        : !confirmationReceived
          ? "guest_confirmation_required"
          : !canCompleteBooking
            ? "booking_requirements_incomplete"
            : !selectedOffer
              ? "no_confirmed_offer"
              : !bookingData.success
                ? "invalid_booking_details"
                : !returnUrl
                  ? "return_url_unavailable"
                  : undefined;
      if (bookingFailure || !bookingData.success || !returnUrl) {
        if (!bookingData.success) {
          options.logger.warn(
            {
              conversationId,
              issues: bookingData.error.issues.map((issue) => issue.path),
            },
            "AI booking payload validation failed",
          );
        }
        finalAction = "answer";
        actionOutcome = {
          tool: "create_booking",
          status: "not_created",
          reason: bookingFailure ?? "invalid_booking_details",
          ...(missingContactFields.length ? { missingContactFields } : {}),
        };
      } else {
        let reservation: Awaited<
          ReturnType<BookingService["createReservation"]>
        > | null = null;
        try {
          reservation = await options.booking.createReservation(
            toReservationBody(bookingData.data, returnUrl),
          );
        } catch {
          finalAction = "answer";
          actionOutcome = {
            tool: "create_booking",
            status: "failed",
          };
        }
        if (reservation) {
          const paymentLink = reservation.payment.confirmationUrl;
          if (paymentLink) bookingUrl = paymentLink;
          actionOutcome = {
            tool: "create_booking",
            status: "created",
            paymentLinkAvailable: Boolean(paymentLink),
            paymentDeadlineMinutes: paymentLink ? 30 : undefined,
          };
          try {
            await options.database.client.adminRequest.update({
              where: { id: conversationId },
              data: {
                details: {
                  ...(requestState?.details &&
                  typeof requestState.details === "object"
                    ? requestState.details
                    : {}),
                  ...(availabilityOffers.length ? { availabilityOffers } : {}),
                  bookingContext: bookingState,
                  bookingContact: nextBookingContact,
                  serviceContext: nextServiceContext,
                  bookingCreatedByAgent: true,
                  paymentLinkSent: Boolean(paymentLink),
                },
              },
            });
          } catch {
            options.logger.warn(
              { conversationId },
              "AI booking succeeded but chat state could not be updated",
            );
          }
        }
      }
    }
    if (finalAction === "create_request" && settings.canCreateRequest) {
      await saveAgentRequest({
        conversationId,
        currentDetails: requestState?.details,
        message,
        history,
        contactRequest: { ...contactRequestDetails, created: true },
        booking: requestedBooking.success ? requestedBooking.data : nextBooking,
        name: result.name ?? detectedName,
        phone: result.phone ?? detectedPhone,
        email: result.email,
      });
      actionOutcome = {
        tool: "create_request",
        status: "registered",
      };
    } else if (finalAction === "create_request") {
      finalAction = "answer";
      actionOutcome = {
        tool: "create_request",
        status: "unavailable",
      };
    }
    if (finalAction === "transfer" && settings.canTransferToEmployee) {
      if (settings.canCreateRequest)
        await saveAgentRequest({
          conversationId,
          currentDetails: requestState?.details,
          message,
          history,
          contactRequest: contactRequestDetails,
          booking: requestedBooking.success
            ? requestedBooking.data
            : nextBooking,
          name: result.name ?? detectedName,
          phone: result.phone ?? detectedPhone,
          email: result.email,
        });
      actionOutcome = {
        tool: "transfer",
        status: "handoff_requested",
      };
    } else if (finalAction === "transfer") {
      finalAction = "answer";
      actionOutcome = {
        tool: "transfer",
        status: "unavailable",
      };
    }
    if (finalAction === "open_page") {
      if (isAgentPage(effectivePage)) {
        bookingUrl = agentPageRoutes[effectivePage];
      } else {
        finalAction = "answer";
      }
    }
    let guestAnswer = result.answer;
    if (actionOutcome) {
      const outcomePrompt = [
        "Составь только окончательный ответ гостю по фактическому результату. Не запускай новое действие в этом сообщении.",
        "Не упоминай JSON, коды ошибок или технические детали. Если бронь создана и есть ссылка на оплату, сообщи об этом и сроке оплаты — ссылка будет приложена отдельно. Если перевод только запрошен, сообщи, что сейчас подключишь сотрудника, не утверждай, что он уже ответил.",
        `Проверенный результат действия: ${JSON.stringify(actionOutcome)}`,
        `Контекст разговора:\n${history || "Нет предыдущих сообщений."}`,
        `Первоначальный ответ агента:\n${result.answer}`,
        `Сообщение гостя: ${message}`,
      ].join("\n\n");
      const followup = await completeWithGateway({
        instructions: globalInstructions,
        input: outcomePrompt,
      });
      const followupResult = followup ? parseAgentCompletion(followup) : null;
      if (followupResult) {
        guestAnswer = followupResult.answer;
        if (
          !bookingUrl &&
          followupResult.action === "open_page" &&
          isAgentPage(followupResult.page)
        )
          bookingUrl = agentPageRoutes[followupResult.page];
      } else if (
        actionOutcome.status !== "created" &&
        actionOutcome.status !== "registered" &&
        actionOutcome.status !== "handoff_requested" &&
        actionOutcome.status !== "completed"
      )
        guestAnswer =
          "Извините, сейчас не удалось выполнить это действие. Я могу помочь вам продолжить обращение.";
    }
    const guestSafeAnswer = guestAnswer
      .replace(/\bEptera(?:\s+Booking\s+API)?\b/giu, "система бронирования")
      .replace(/\bЭптера\b/giu, "система бронирования")
      .trim();
    const answer = guestSafeAnswer;
    await options.chat.publish(conversationId, "agent", answer, bookingUrl);
    return { action: finalAction, answer };
  };
  const reply = async (
    conversationId: string,
    message: string,
    channel: "site" | "vk" | "max" = "site",
  ) => {
    const previous =
      conversationQueues.get(conversationId) ?? Promise.resolve();
    let release!: () => void;
    const turn = new Promise<void>((resolve) => {
      release = resolve;
    });
    const queued = previous.then(() => turn);
    conversationQueues.set(conversationId, queued);
    await previous;
    try {
      return await replyNow(conversationId, message, channel);
    } finally {
      release();
      if (conversationQueues.get(conversationId) === queued)
        conversationQueues.delete(conversationId);
    }
  };
  return { reply };
};
export type AiAgentService = ReturnType<typeof createAiAgentService>;
