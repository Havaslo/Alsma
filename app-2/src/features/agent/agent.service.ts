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
  formatEpteraOffersForGuest,
  isExplicitBookingConfirmation,
  normalizeAgentOfferSummaries,
  summarizeEpteraOffers,
  toReservationBody,
} from "./agent-booking.js";
import { ensureDefaultAgentPlaybook } from "./agent-playbook.js";
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
    "create_booking",
    "create_request",
    "transfer",
  ]),
  confirmed: z.boolean().optional(),
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
  offerId: z.string().trim().min(1).max(300).optional(),
  answer: z.string().trim().min(1).max(4_000),
  booking: z.unknown().optional(),
});
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
  tone: "доброжелательный, спокойный и полезный",
  language: "русский",
  bookingUrl: "",
  canCheckAvailability: true,
  canCreateRequest: true,
  canTransferToEmployee: true,
  showAiDisclosure: true,
  disclosureText: "Я AI-ассистент отеля «Алсма». ",
  ...(value && typeof value === "object" ? value : {}),
  canCreateBooking: true,
});
const normalizeBaseUrl = (value?: string) => (value ?? "").replace(/\/$/u, "");
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
const isExplicitPageRequest = (text: string) =>
  /(?:открой|открыть|пришли|скинь|дай\s+(?:мне\s+)?ссылк|ссылк(?:у|а)?\s+на|страниц(?:у|а)?|полный\s+каталог)/iu.test(
    text,
  );
const asksCheckInOutTime = (text: string) =>
  /(?:когда|во\s+сколько|врем|час).*(?:заезд|въезд|засел|выезд|отъезд)|(?:заезд|въезд|засел|выезд|отъезд).*(?:когда|во\s+сколько|врем|час)|расч[её]тн(?:ый|ого)\s+час/iu.test(
    text,
  );

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
const scenarioMatches = (trigger: string, text: string) =>
  trigger
    .split(/[\n,;|]+/u)
    .map((item) => item.trim())
    .filter(Boolean)
    .some((item) =>
      text.toLocaleLowerCase("ru-RU").includes(item.toLocaleLowerCase("ru-RU")),
    );
const choosesManagerTransfer = (text: string) =>
  /перевед(?:ите|и)|соедин(?:ите|и)|сразу\s+менеджер|переда(?:йте|йт)\s+менеджер|хочу\s+с\s+менеджер/iu.test(
    text,
  );
const choosesCallback = (text: string) =>
  /остав(?:лю|ить)|контакт|номер\s+телефон|пусть\s+менеджер\s+свяж|второй\s+вариант|по\s+контактам/iu.test(
    text,
  );
const explicitlyRequestsAgentRequest = (text: string) =>
  /(?:созд(?:ай|ать|айте)|сдел(?:ай|ать|айте)|оформ(?:и|ить|ите)|запиш(?:и|ите|ать))\s+(?:мне\s+)?заявк|пересозд(?:ай|ать|айте)\s+(?:е[её]|заявк)|заявк[уы]\s+занов/iu.test(
    text,
  );
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
      source: "AI-agent",
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
    if (asksCheckInOutTime(message)) {
      const answer =
        "Для проживания время заезда и выезда фиксированное и не зависит от тарифа или номера: заезд — в 16:00, выезд — в 14:00. Ранний заезд и поздний выезд возможны отдельно, если доступны, и оплачиваются по правилам отеля.";
      await options.chat.publish(conversationId, "agent", answer);
      return { action: "answer" as const, answer };
    }
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
    const contactScenario =
      await options.database.client.agentScenario.findFirst({
        where: { title: "Перезвон и нестандартные мероприятия", enabled: true },
        select: { response: true, trigger: true },
      });
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
    const hasContactData = Boolean(detectedName && detectedPhone);
    const contactIntent = Boolean(
      contactScenario && scenarioMatches(contactScenario.trigger, message),
    );
    const managerTransfer = choosesManagerTransfer(message);
    const callbackChoice = choosesCallback(message);
    const explicitCreateRequest = explicitlyRequestsAgentRequest(message);
    const awaitingContacts =
      previousContactRequest.awaitingContacts === true ||
      previousContactRequest.awaitingChoice === true ||
      (contactIntent && callbackChoice);
    const contactRequestDetails = {
      ...previousContactRequest,
      ...(contactIntent || previousContactRequest.awaitingChoice
        ? { awaitingChoice: false }
        : {}),
      ...(awaitingContacts ? { awaitingContacts: true } : {}),
      ...(detectedName ? { name: detectedName } : {}),
      ...(detectedPhone ? { phone: detectedPhone } : {}),
      ...(detectedEmail ? { email: detectedEmail } : {}),
    };
    if (explicitCreateRequest) {
      if (!hasContactData) {
        const missing = detectedName
          ? "номер телефона"
          : detectedPhone
            ? "имя"
            : "имя и номер телефона";
        const answer = `Чтобы создать заявку, напишите ${missing}.`;
        await options.database.client.adminRequest.update({
          where: { id: conversationId },
          data: {
            details: {
              ...(requestState?.details &&
              typeof requestState.details === "object"
                ? requestState.details
                : {}),
              contactRequest: {
                ...contactRequestDetails,
                awaitingContacts: true,
              },
            },
          },
        });
        await options.chat.publish(conversationId, "agent", answer);
        return { action: "answer" as const, answer };
      }
      await saveAgentRequest({
        conversationId,
        currentDetails: requestState?.details,
        message,
        history,
        contactRequest: { ...contactRequestDetails, created: true },
        booking: previousState.booking,
        name: detectedName,
        phone: detectedPhone,
      });
      const answer = previousContactRequest.created
        ? "Заявка обновлена. Менеджер свяжется с вами по указанному номеру."
        : "Заявка создана. Менеджер свяжется с вами по указанному номеру.";
      await options.chat.publish(conversationId, "agent", answer);
      return { action: "answer" as const, answer };
    }
    if (
      contactIntent &&
      !callbackChoice &&
      !managerTransfer &&
      !hasContactData
    ) {
      const answer =
        "Могу сразу передать диалог менеджеру или принять ваши имя и номер телефона — менеджер свяжется с вами. Какой вариант удобнее?";
      await options.database.client.adminRequest.update({
        where: { id: conversationId },
        data: {
          details: {
            ...(requestState?.details &&
            typeof requestState.details === "object"
              ? requestState.details
              : {}),
            contactRequest: { awaitingChoice: true },
          },
        },
      });
      await options.chat.publish(conversationId, "agent", answer);
      return { action: "answer" as const, answer };
    }
    if (managerTransfer) {
      if (
        hasContactData ||
        previousContactRequest.awaitingContacts ||
        previousContactRequest.awaitingChoice ||
        previousState.booking
      ) {
        await saveAgentRequest({
          conversationId,
          currentDetails: requestState?.details,
          message,
          history,
          contactRequest: contactRequestDetails,
          booking: previousState.booking,
          name: detectedName,
          phone: detectedPhone,
        });
      }
      return {
        action: "transfer" as const,
        answer: "Передаю диалог менеджеру — он подключится к вам.",
      };
    }
    if (awaitingContacts && !hasContactData) {
      const missing = detectedName
        ? "номер телефона"
        : detectedPhone
          ? "имя"
          : "имя и номер телефона";
      const answer = `Пожалуйста, напишите ${missing}. Их можно отправить одним сообщением или по очереди.`;
      await options.database.client.adminRequest.update({
        where: { id: conversationId },
        data: {
          details: {
            ...(requestState?.details &&
            typeof requestState.details === "object"
              ? requestState.details
              : {}),
            contactRequest: contactRequestDetails,
          },
        },
      });
      await options.chat.publish(conversationId, "agent", answer);
      return { action: "answer" as const, answer };
    }
    if (awaitingContacts && hasContactData && !previousContactRequest.created) {
      const answer =
        "Спасибо, я передал заявку менеджеру. Он свяжется с вами по указанному номеру.";
      await saveAgentRequest({
        conversationId,
        currentDetails: requestState?.details,
        message,
        history,
        contactRequest: { ...contactRequestDetails, created: true },
        booking: previousState.booking,
        name: detectedName,
        phone: detectedPhone,
      });
      await options.chat.publish(conversationId, "agent", answer);
      return { action: "answer" as const, answer };
    }
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
          ...(hasBookingContactData(nextBookingContact)
            ? { bookingContact: nextBookingContact }
            : {}),
        },
      },
    });
    const extractedBooking = bookingFromContext(nextBooking);
    let availabilityOffers = nextAvailabilityOffers ?? [];
    const bookingCriteriaChanged = Boolean(
      entities.adults !== undefined ||
      entities.childAges !== undefined ||
      entities.roomCount !== undefined,
    );
    const shouldRefreshAvailability = Boolean(
      settings.canCheckAvailability &&
      extractedBooking &&
      (currentMessageHasDate ||
        bookingCriteriaChanged ||
        availabilityOffers.length === 0),
    );
    let availabilityLookupAttempted = false;
    if (shouldRefreshAvailability && extractedBooking) {
      options.chat.publishStatus(
        conversationId,
        "checking_availability",
        "Проверяю доступные варианты",
      );
      try {
        const search = {
          adults: extractedBooking.adults,
          checkIn: extractedBooking.checkInDate,
          checkOut: extractedBooking.checkOutDate,
          childAges: extractedBooking.childAges,
          children: extractedBooking.childAges.length,
          currency: "RUB",
          language: "ru",
          nationality: "RU",
          roomCount: extractedBooking.roomCount,
        };
        availabilityLookupAttempted = true;
        let summarizedOffers: ReturnType<typeof summarizeEpteraOffers> = [];
        for (let attempt = 0; attempt < 2; attempt += 1) {
          const result = await options.booking.offers(search);
          summarizedOffers = summarizeEpteraOffers(result.offers);
          if (summarizedOffers.length > 0 || attempt === 1) break;
          options.chat.publishStatus(
            conversationId,
            "checking_availability",
            "Получаю подтверждённые варианты",
          );
          await wait(500);
        }
        availabilityOffers = summarizedOffers;
        await options.database.client.adminRequest.update({
          where: { id: conversationId },
          data: {
            details: {
              ...(requestState?.details &&
              typeof requestState.details === "object"
                ? requestState.details
                : {}),
              availabilityOffers,
              bookingContext: nextBooking,
              serviceContext: nextServiceContext,
              ...(hasBookingContactData(nextBookingContact)
                ? { bookingContact: nextBookingContact }
                : {}),
            },
          },
        });
      } catch (error) {
        availabilityLookupAttempted = true;
        options.logger.warn(
          {
            error: error instanceof Error ? error.message : "Unknown error",
          },
          "Eptera availability lookup for chat agent failed",
        );
        availabilityOffers = [];
      }
    }
    const bookingConfirmationMessage = isExplicitBookingConfirmation(message);
    const shouldAnswerAvailabilityDirectly = Boolean(
      extractedBooking &&
      availabilityLookupAttempted &&
      (currentMessageHasDate || bookingCriteriaChanged) &&
      !hasBookingContactData(nextBookingContact) &&
      !bookingConfirmationMessage &&
      !serviceMention(message),
    );
    if (shouldAnswerAvailabilityDirectly) {
      const answer = availabilityOffers.length
        ? `На указанные даты доступны следующие номера:\n\n${formatEpteraOffersForGuest(availabilityOffers, nextBooking.checkInDate, nextBooking.checkOutDate)}\n\nКакой вариант хотите рассмотреть подробнее?`
        : "Пока не удалось получить подтверждённый список вариантов на эти даты. Я не буду показывать непроверенные данные — попробуйте запросить наличие ещё раз немного позже.";
      await options.chat.publish(conversationId, "agent", answer);
      return { action: "answer" as const, answer };
    }
    const isBookingContactMessage = Boolean(
      currentName ||
      currentPhone ||
      currentEmail ||
      (bookingConfirmationMessage && isBookingRequest(message, nextBooking)),
    );
    const knowledgeResult = isBookingContactMessage
      ? { sources: [] as Array<{ content: string }> }
      : await knowledge.answer({ channel: "text", question: message });
    const [
      scenarios,
      transferRules,
      knowledgeRules,
      offersContext,
      eventsContext,
    ] = await Promise.all([
      options.database.client.agentScenario.findMany({
        where: { enabled: true, channels: { has: "text" } },
        orderBy: { updatedAt: "desc" },
      }),
      options.database.client.agentTransferRule.findMany({
        where: { enabled: true, channels: { has: "text" } },
        orderBy: { createdAt: "asc" },
      }),
      options.database.client.agentRule.findMany({
        where: { enabled: true, channels: { has: "text" } },
        orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
      }),
      loadPublishedOffersContext(options.database),
      loadPublishedEventsContext(
        options.database,
        calendarDateInMessage(message),
      ).catch(() => ""),
    ]);
    if (serviceMention(message) === "offers" && !offersContext) {
      const transferNotice =
        "Сейчас нет опубликованных актуальных акций. Передам вопрос менеджеру, чтобы он уточнил доступные предложения.";
      await options.chat.publish(conversationId, "agent", transferNotice);
      return { action: "transfer" as const, answer: transferNotice };
    }
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
    const scenarioTrigger =
      serviceMention(message) ??
      (currentMessageHasDate || extractedBooking ? "booking" : undefined);
    const selectedScenario = scenarioTrigger
      ? scenarios.find((item) => item.trigger === scenarioTrigger)
      : undefined;
    const asksOfferDetails =
      /сравн|тариф|питан|услов|отмен|включен|услуг|подроб|отлич(?:а|ие)|комфорт|балкон|кроват/iu.test(
        message,
      );
    const prompt = [
      `Ты AI-ассистент SPA-отеля «Алсма». Тон: ${settings.tone}. Отвечай на ${settings.language}.`,
      "Приветствие уже показано отдельным сообщением интерфейса. Не упоминай, что ты AI-ассистент, не начинай ответ со слова «Здравствуйте» и не добавляй служебное раскрытие в ответ.",
      "Отвечай только по контексту базы знаний и данным наличия. Не выдумывай цены, наличие или условия. Не вставляй статьи базы знаний целиком и не перечисляй внутренний контекст.",
      "Каждый ответ должен продвигать диалог: либо задай один конкретный вопрос, либо предложи одно понятное действие. Не повторяй описание SPA, если оно уже было дано. Если гость выражает общий интерес, сначала предложи выбор из двух-трёх форматов (проживание, SPA на день, процедуры), а не новый список услуг.",
      "Разделяй контексты: проживание хранится отдельно от SPA, процедур и акций. Если тема меняется, не сбрасывай разговор и не повторяй стартовый выбор. Если сервисный контекст уже выбран, сразу отвечай по нему. Если гость спрашивает об акциях, скидках или специальных предложениях, отвечай по базе знаний; страницу акций предлагай как следующий шаг, а не вместо ответа. Для SPA и процедур сначала объясняй варианты и помогай выбрать; страницу открывай только по прямой просьбе гостя или если активный сценарий из админки явно требует перехода. Для запроса о проживании сначала собери даты, состав гостей и число номеров, затем используй переданные актуальные варианты Eptera. По этим вариантам отвечай на вопросы о наличии, подборе и сравнении.",
      "Для вопросов о мероприятиях используй только опубликованный календарь ниже. Не выдумывай названия, даты или условия; если подходящего события нет или календарь недоступен, честно скажи, что у тебя нет подтверждённой информации, и предложи уточнить у менеджера.",
      "Для проживания время заезда и выезда всегда фиксированное: заезд в 16:00, выезд в 14:00. Это не зависит от тарифа или категории номера. Не говори, что время зависит от выбранного тарифа или номера. Ранний заезд и поздний выезд — отдельные платные услуги при наличии возможности.",
      "Не задавай больше одного вопроса за ответ и не возвращайся к уже решённому вопросу. Используй transfer только если гость прямо попросил менеджера/сотрудника или выполнено конкретное правило передачи; фраза «попробуйте ещё раз» сама по себе НЕ является передачей. После двух повторов или отсутствия прогресса используй transfer. Если гость просит другие даты без новых дат, это команда начать новый поиск: не повторяй старый результат, не называй старые даты и спроси только новые даты или предложи ближайшие свободные варианты.",
      `Eptera доступна для поиска и сравнения: ${settings.canCheckAvailability}. Создание бронирования через booking-сервис разрешено только текстовым каналам после явного подтверждения клиента: ${settings.canCreateBooking}. Агент может создать заявку: ${settings.canCreateRequest}. Может передать сотруднику: ${settings.canTransferToEmployee}. Не придумывай номера, цены или наличие; используй только переданные варианты.`,
      "Если данных для поиска или бронирования не хватает, задай один короткий уточняющий вопрос. Для передачи сотруднику используй action transfer. Для перехода на страницу используй action open_page только если гость прямо попросил ссылку/страницу/каталог или активный сценарий из админки явно задаёт переход. Если гость спрашивает, какие варианты есть, сначала ответь по существу и не открывай страницу автоматически. Для создания бронирования верни action create_booking только после явного подтверждения в текущем сообщении, confirmed: true, offerId выбранного варианта и полные данные гостя (имя, фамилия, телефон, email). До подтверждения только покажи сравнение и попроси подтвердить выбранный вариант.",
      `Если гость назвал день и месяц без года, подразумевай текущий год ${new Date().getFullYear()}. Перед проверкой обязательно назови гостю полные даты в формате «12 сентября ${new Date().getFullYear()} — 15 сентября ${new Date().getFullYear()}». Преобразуй русские даты вроде «20–22 августа» или «20–22 августа 2026» в ISO YYYY-MM-DD и только так заполняй booking.`,
      "Извлекай из одного сообщения все сущности сразу: даты заезда/выезда, взрослых, детей и количество номеров. Любые новые даты полностью заменяют прежние даты в сохранённом booking-контексте; не спрашивай год, если указан день и месяц — используй текущий год. Если гость явно указал «1 взрослый» и «1 номер» — используй adults: 1 и roomCount: 1, дополнительных вопросов об этих значениях не задавай. Если дети не упомянуты или гость явно сказал, что детей нет, используй childAges: [] и не спрашивай возраст детей. Спрашивай возраст только если дети упомянуты, но их возраст нужен для проверки.",
      "Если варианты Eptera переданы ниже, сравни их по типу номера, тарифу, питанию, цене, вместимости и преимуществам. Не создавай бронирование и не обещай его до явного подтверждения клиента. Для нескольких номеров учитывай roomCount и выбранные варианты.",
      "В первом ответе после поиска не перечисляй тарифы, питание, услуги, условия отмены, описание номера, внутренние идентификаторы или другие дополнительные детали. Покажи только краткие карточки доступных типов номеров: название отдельной строкой жирным Markdown, затем вместимость, площадь и цену за ночь. Каждый тип номера — отдельный блок. Подробности, сравнение тарифов и дополнительные услуги показывай только если гость попросил об этом отдельным сообщением.",
      "Верни только JSON без markdown в формате: {action:'answer'|'open_page'|'create_booking'|'create_request'|'transfer', confirmed?:boolean, offerId?, page?:'spa'|'hardware-procedures'|'offers', name?, phone?, email?, checkInDate?, checkOutDate?, guestsCount?, booking?:{checkInDate,checkOutDate,adults,childAges,roomCount,offerId,firstName,lastName,phone,email,paymentMethod,guests?}, answer:string}. Для open_page page обязателен. Для create_booking обязательно confirmed:true и явное подтверждение гостя в текущем сообщении. Если выбранный сценарий задаёт action или page, следуй ему, кроме запрета на создание брони без подтверждения.",
      `База знаний:\n${context || "Нет подходящей статьи."}`,
      `Актуальные акции с опубликованной страницы offers (используй эти данные для вопросов об акциях; не придумывай условия):\n${offersContext || "Опубликованных акций сейчас нет."}`,
      `Опубликованные актуальные мероприятия с публичного календаря${calendarDateInMessage(message) ? ` на дату ${calendarDateInMessage(message)}` : ""} (не выдумывай события):\n${eventsContext || "Опубликованных мероприятий на запрошенную дату сейчас нет или календарь недоступен."}`,
      `Актуальные варианты Eptera для проживания (это подтверждённые данные поиска; можно сравнивать, но нельзя придумывать дополнительные варианты):\n${formatEpteraOffersForAgent(availabilityOffers, asksOfferDetails) || "Варианты ещё не найдены. Сначала уточни даты, гостей и количество номеров."}`,
      `Сохранённые контакты для оформления брони (не запрашивай уже указанные поля повторно): ${JSON.stringify(nextBookingContact)}. Если часть данных отсутствует, попроси только недостающие поля. Email и телефон — это данные бронирования, а не вопрос к базе знаний. После выбора номера и получения всех контактов покажи итог и спроси: «Подтверждаете создание брони?»`,
      `Сценарии из админки (активные записи имеют приоритет; их action/page управляют переходом):\n${scenarioContext || "Нет дополнительных сценариев."}`,
      `Выбранный сценарий для этого сообщения:\n${selectedScenario ? JSON.stringify({ title: selectedScenario.title, trigger: selectedScenario.trigger, action: selectedScenario.action, page: selectedScenario.page, response: selectedScenario.response }) : "не определён"}`,
      `Правила передачи:\n${transferContext || "Нет дополнительных правил."}`,
      `Активные правила базы знаний:\n${knowledgeRuleContext || "Нет дополнительных правил."}`,
      `Сохранённое состояние диалога:\n${JSON.stringify({ availabilityOffers, booking: nextBooking, serviceContext: nextServiceContext })}`,
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
    const requestedBooking = bookingSchema.safeParse(result.booking);
    const scenarioAction = selectedScenario?.action ?? "answer";
    const keepAnswerForServiceQuestion = Boolean(
      serviceMention(message) &&
      !isExplicitPageRequest(message) &&
      scenarioAction !== "open_page",
    );
    const effectiveAction =
      scenarioAction === "answer"
        ? keepAnswerForServiceQuestion
          ? "answer"
          : result.action
        : scenarioAction;
    const effectivePage =
      scenarioAction === "open_page"
        ? (selectedScenario?.page ?? result.page)
        : result.page;
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
    const bookingState = requestedOfferId
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
    if (canCompleteBooking) finalAction = "create_booking";
    let generatedAnswer: string | undefined;
    let bookingUrl: string | undefined;
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
      if (
        !settings.canCreateBooking ||
        (!confirmationReceived && result.confirmed !== true) ||
        !selectedOffer ||
        !bookingData.success ||
        !returnUrl
      ) {
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
        generatedAnswer = missingContactFields.length
          ? `Перед созданием брони ещё нужны: ${missingContactFields.join(", ")}.`
          : !confirmationReceived
            ? "Данные для бронирования получил. Подтверждаете создание брони?"
            : !selectedOffer
              ? "Сначала выберите один из доступных вариантов номера."
              : "Не удалось проверить данные бронирования. Проверьте выбранный номер и контакты.";
      } else {
        try {
          const reservation = await options.booking.createReservation(
            toReservationBody(bookingData.data, returnUrl),
          );
          const paymentLink = reservation.payment.confirmationUrl;
          if (!paymentLink) throw new Error("Payment link is missing");
          bookingUrl = paymentLink;
          generatedAnswer =
            "Бронь создана. Перейдите по ссылке оплаты и завершите оплату в течение 30 минут, иначе бронь будет автоматически отменена.";
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
                paymentLinkSent: true,
              },
            },
          });
        } catch {
          finalAction = "answer";
          generatedAnswer =
            "Не удалось создать бронь по выбранному варианту. Попробуйте ещё раз или я передам диалог менеджеру.";
        }
      }
    }
    const suppliedBookingContact = Boolean(
      nameFromText(message) || phoneFromText(message) || emailFromText(message),
    );
    if (
      finalAction !== "create_booking" &&
      suppliedBookingContact &&
      bookingFromContext(bookingState) &&
      !confirmationReceived
    ) {
      finalAction = "answer";
      if (missingContactFields.length > 0) {
        generatedAnswer = `Спасибо, данные получил. Для оформления брони ещё нужны: ${missingContactFields.join(", ")}.`;
      } else if (selectedOffer) {
        generatedAnswer = `Данные получил. Вы выбрали номер «${selectedOffer.roomType}» на даты ${bookingState.checkInDate} — ${bookingState.checkOutDate}. Подтверждаете создание брони?`;
      } else {
        generatedAnswer =
          "Контакты получил и сохранил. Какой из доступных номеров оформить?";
      }
    }
    if (
      settings.canCreateRequest &&
      (finalAction === "create_request" || finalAction === "transfer")
    ) {
      await saveAgentRequest({
        conversationId,
        currentDetails: requestState?.details,
        message,
        history,
        contactRequest: previousContactRequest,
        booking: requestedBooking.success ? requestedBooking.data : nextBooking,
        name: result.name ?? detectedName,
        phone: result.phone ?? detectedPhone,
        email: result.email,
      });
    }
    if (finalAction === "open_page") {
      bookingUrl =
        effectivePage === "hardware-procedures"
          ? "/hardware-procedures"
          : effectivePage === "offers"
            ? "/offers"
            : "/spa";
    }
    const transferNotice =
      "Я передал диалог сотруднику — он подключится к вам.";
    const answerWithTransfer =
      finalAction === "transfer" &&
      settings.canTransferToEmployee &&
      !result.answer.includes(transferNotice)
        ? `${generatedAnswer ?? result.answer} ${transferNotice}`
        : (generatedAnswer ?? result.answer);
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
    const availabilityWasFound = availabilityOffers.length > 0;
    const availabilityIsNew =
      currentMessageHasDate ||
      bookingCriteriaChanged ||
      !previousState.availabilityOffers?.length;
    const availabilityLookupNeedsNotice =
      availabilityLookupAttempted && !availabilityWasFound;
    const answerWithAvailability =
      availabilityWasFound && availabilityIsNew && finalAction === "answer"
        ? `На указанные даты доступны следующие номера:\n\n${formatEpteraOffersForGuest(availabilityOffers, nextBooking.checkInDate, nextBooking.checkOutDate)}\n\nКакой вариант хотите рассмотреть подробнее?`
        : availabilityLookupNeedsNotice && finalAction === "answer"
          ? "Пока не удалось получить подтверждённый список вариантов на эти даты. Я не буду показывать непроверенные данные — попробуйте запросить наличие ещё раз немного позже."
          : guestSafeAnswer;
    let answer =
      answerWithAvailability || "Подскажите, пожалуйста, чем я могу помочь?";
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
