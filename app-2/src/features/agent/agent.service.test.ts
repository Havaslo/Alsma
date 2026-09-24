import assert from "node:assert/strict";
import test from "node:test";

import type { Database } from "../../lib/database/database.js";
import {
  formatEpteraOffersForGuest,
  normalizeAgentOfferSummaries,
  selectPrimaryEpteraOffers,
} from "./agent-booking.js";
import { createAiAgentService } from "./agent.service.js";

const offer = {
  benefits: ["Завтрак"],
  boardType: "Завтрак",
  currency: "RUB",
  discountedPrice: 9_000,
  id: "offer-1",
  rateDescription: "Гибкий тариф",
  rateType: "Гибкий",
  roomArea: 28,
  roomCapacity: 2,
  roomDescription: "Номер с видом на лес",
  roomImageUrl: null,
  roomToSell: 3,
  roomType: "Стандарт",
  price: 10_000,
};

const createHarness = (
  options: {
    emptyOffersFirst?: boolean;
    gatewayFailure?: boolean;
    malformedConfirmation?: boolean;
  } = {},
) => {
  let details: Record<string, unknown> = {};
  let emptyOffersRemaining = options.emptyOffersFirst ? 1 : 0;
  const published: Array<{
    author: string;
    text: string;
    bookingUrl?: string;
  }> = [];
  const bookingSearches: unknown[] = [];
  const requestBodies: Array<{ model?: string; temperature?: number }> = [];
  const knowledgeQueries: string[] = [];
  const models: string[] = [];
  const reservations: unknown[] = [];
  const prompts: string[] = [];
  const warnings: Array<{
    fields: Record<string, unknown>;
    message: string;
  }> = [];
  const settings = {
    bookingUrl: "/booking",
    canCheckAvailability: true,
    canCreateBooking: true,
    canCreateRequest: true,
    canTransferToEmployee: true,
    enabled: true,
    max: true,
    site: true,
    tone: "спокойный",
    language: "русский",
    vk: true,
    voice: true,
  };
  const client = {
    adminRequest: {
      findUnique: async () => ({ details }),
      update: async ({ data }: { data: { details: unknown } }) => {
        details = data.details as Record<string, unknown>;
        return { details };
      },
    },
    agentRule: { findMany: async () => [] },
    agentScenario: {
      create: async () => ({}),
      findFirst: async () => null,
      findMany: async () => [],
    },
    agentTransferRule: {
      create: async () => ({}),
      findFirst: async () => null,
      findMany: async () => [],
    },
    appSetting: {
      findUnique: async ({ where }: { where: { key: string } }) =>
        where.key === "agent.settings" ? { value: settings } : null,
    },
    knowledgeChunk: { findMany: async () => [] },
    knowledgeQueryLog: {
      create: async ({ data }: { data: { query: string } }) => {
        knowledgeQueries.push(data.query);
        return {};
      },
    },
    siteContent: {
      findFirst: async () => null,
      findMany: async () => [],
    },
  };
  const chat = {
    list: async () => published,
    publish: async (
      _conversationId: string,
      author: string,
      text: string,
      bookingUrl?: string,
    ) => {
      published.push({ author, bookingUrl, text });
      return { text };
    },
    publishStatus: () => undefined,
  };
  const booking = {
    offers: async (input: unknown) => {
      bookingSearches.push(input);
      if (emptyOffersRemaining > 0) {
        emptyOffersRemaining -= 1;
        return { offers: [], search: input };
      }
      return { offers: [offer], search: input };
    },
    createReservation: async (input: unknown) => {
      reservations.push(input);
      return {
        payment: { confirmationUrl: "https://yookassa.test/payment-1" },
      };
    },
  };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_input, init) => {
    const body = JSON.parse(String(init?.body)) as {
      model?: string;
      temperature?: number;
      messages?: Array<{ content?: string }>;
    };
    requestBodies.push(body);
    if (body.model) models.push(body.model);
    const prompt = body.messages?.[0]?.content ?? "";
    prompts.push(prompt);
    if (options.gatewayFailure)
      return new Response(
        JSON.stringify({
          error: {
            code: "unsupported_value",
            message: "Invalid authorization value Bearer test-key",
            type: "invalid_request_error",
          },
        }),
        { headers: { "x-request-id": "req-test" }, status: 400 },
      );
    const guestMessage = prompt.match(/Сообщение гостя:\s*(.*)$/u)?.[1] ?? "";
    const content = /Да, бронируйте|создавай|подтверждаю/iu.test(guestMessage)
      ? {
          action: "create_booking",
          answer: "Оформляю выбранный вариант.",
          booking: options.malformedConfirmation
            ? {
                adults: "один",
                checkInDate: "13 августа 2026",
                checkOutDate: "15 августа 2026",
                email: "не email",
                firstName: "Стандарт",
                lastName: "",
                offerId: "Стандарт",
                phone: "не телефон",
                roomCount: 0,
              }
            : {
                adults: 1,
                checkInDate: "2026-08-13",
                checkOutDate: "2026-08-15",
                childAges: [],
                email: "ivan@example.com",
                firstName: "Иван",
                lastName: "Иванов",
                offerId: "offer-1",
                phone: "+79990000000",
                roomCount: 1,
              },
          confirmed: true,
          offerId: "offer-1",
        }
      : /^(?:привет|здравствуйте|добрый день)[,!\s]/iu.test(guestMessage)
        ? {
            action: "answer",
            answer: "Привет! Спасибо, всё хорошо 🙂 Чем могу помочь?",
          }
        : guestMessage.includes("Беру вариант 1")
          ? {
              action: "answer",
              answer: "Хорошо, для оформления нужны контакты.",
              offerId: "offer-1",
            }
          : /погода на Марсе/iu.test(guestMessage)
            ? {
                action: "answer",
                answer:
                  "Не могу подсказать погоду на Марсе, но могу помочь с отдыхом в АЛСМА или подобрать даты поездки.",
              }
            : {
                action: "answer",
                answer: "Сейчас подтверждённых вариантов по этим датам нет.",
              };
    return {
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({
        choices: [{ message: { content: JSON.stringify(content) } }],
      }),
      text: async () => "",
    } as Response;
  };
  const service = createAiAgentService({
    apiKey: "test-key",
    baseUrl: "https://gateway.test/v1",
    booking: booking as never,
    bookingReturnUrl: "https://alsma.ru/booking/return",
    bookingUrl: "/booking",
    chat: chat as never,
    database: { client } as unknown as Database,
    logger: {
      warn: (fields: Record<string, unknown>, message: string) =>
        warnings.push({ fields, message }),
    } as never,
  });
  return {
    bookingSearches,
    details: () => details,
    knowledgeQueries,
    models,
    originalFetch,
    prompts,
    published,
    requestBodies,
    reservations,
    service,
    warnings,
  };
};

test("searches Eptera availability and exposes offers for comparison", async () => {
  const harness = createHarness();
  try {
    await harness.service.reply(
      "conversation-1",
      "Нужен номер с 2026-08-13 по 2026-08-15, 1 взрослый",
    );
    assert.match(harness.published.at(-1)?.text ?? "", /Стандарт/u);
    assert.match(
      harness.published.at(-1)?.text ?? "",
      /Цена за ночь: 4[\s\u00a0]?500 ₽/u,
    );
    assert.match(harness.published.at(-1)?.text ?? "", /\*\*Стандарт\*\*/u);
    assert.doesNotMatch(
      harness.published.at(-1)?.text ?? "",
      /Завтрак|тариф|питание/u,
    );
    assert.doesNotMatch(harness.published.at(-1)?.text ?? "", /offerId=/u);
    await harness.service.reply("conversation-1", "Сравните варианты по цене");
    assert.equal(harness.bookingSearches.length, 1);
    assert.deepEqual(harness.bookingSearches[0], {
      adults: 1,
      checkIn: "2026-08-13",
      checkOut: "2026-08-15",
      childAges: [],
      children: 0,
      currency: "RUB",
      language: "ru",
      nationality: "RU",
      roomCount: 1,
    });
    assert.match(harness.prompts[0] ?? "", /offerId: offer-1/u);
    assert.match(harness.prompts[0] ?? "", /тепло и доброжелательно/u);
    assert.match(harness.prompts[0] ?? "", /не более одного уместного эмодзи/u);
    assert.equal(harness.models[0], "gpt-6-luna");
    assert.equal(harness.requestBodies[0]?.temperature, undefined);
    assert.equal(harness.details().availabilityOffers instanceof Array, true);
  } finally {
    globalThis.fetch = harness.originalFetch;
  }
});

test("logs Gateway failures without retaining raw secrets", async () => {
  const harness = createHarness({ gatewayFailure: true });
  try {
    await harness.service.reply("gateway-failure", "Привет, как дела?");
    assert.equal(harness.warnings.length, 2);
    const fields = harness.warnings[0]?.fields;
    assert.equal(fields?.gatewayStatus, 400);
    assert.equal(fields?.gatewayErrorCode, "unsupported_value");
    assert.equal(fields?.gatewayErrorType, "invalid_request_error");
    assert.equal(fields?.gatewayRequestId, "req-test");
    assert.doesNotMatch(String(fields?.gatewayErrorMessage), /test-key/u);
    assert.equal(Object.hasOwn(fields ?? {}, "gatewayError"), false);
  } finally {
    globalThis.fetch = harness.originalFetch;
  }
});

test("waits for a delayed availability result and sends it without a second guest message", async () => {
  const harness = createHarness({ emptyOffersFirst: true });
  try {
    await harness.service.reply(
      "conversation-delayed-availability",
      "Нужен номер с 2026-08-13 по 2026-08-15, 1 взрослый",
    );
    assert.equal(harness.bookingSearches.length, 2);
    assert.equal(harness.prompts.length, 0);
    assert.match(harness.published.at(-1)?.text ?? "", /Стандарт/u);
    assert.match(
      harness.published.at(-1)?.text ?? "",
      /Цена за ночь: 4[\s\u00a0]?500 ₽/u,
    );
  } finally {
    globalThis.fetch = harness.originalFetch;
  }
});

test("formats one compact block per room type without booking details", () => {
  const formatted = formatEpteraOffersForGuest(
    [
      offer,
      { ...offer, discountedPrice: 11_000, id: "offer-2" },
      { ...offer, roomType: "Супериор", roomArea: null, roomCapacity: 3 },
    ],
    "2026-08-13",
    "2026-08-15",
  );
  assert.equal((formatted.match(/\*\*/gu) ?? []).length, 4);
  assert.match(formatted, /\*\*Стандарт\*\*/u);
  assert.match(formatted, /\*\*Супериор\*\*/u);
  assert.match(formatted, /Вместимость: до 2 гостей/u);
  assert.match(formatted, /Площадь: 28 м²/u);
  assert.match(formatted, /Площадь: не указана/u);
  assert.match(formatted, /Цена за ночь: 4[\s\u00a0]?500 ₽/u);
  assert.doesNotMatch(formatted, /Завтрак|тариф|питание|offerId|включено/u);
});

test("normalizes the 117-offer Eptera payload before it reaches the chat", () => {
  const roomTypes = [
    "Стандарт трехместный",
    "Супериор",
    "Супериор трехместный",
    "Полулюкс",
    "Полулюкс +",
    "Полулюкс без балкона",
    "Двухуровневый полулюкс",
    "Двухуровневый полулюкс с 2 спальнями",
    "Люкс",
    'Коттедж "русская баня"',
  ];
  const payload = Array.from({ length: 117 }, (_, index) => ({
    ...offer,
    id: `payload-${index}`,
    roomType:
      index < 90
        ? roomTypes[index % roomTypes.length]!
        : index < 99
          ? "Гостевой Дом (ДЛЯ ГРУПП)№7"
          : index < 108
            ? "Корпус 2"
            : "Тест",
    roomDescription:
      index >= 90
        ? "объект для групповых заездов или тестовый номер"
        : offer.roomDescription,
    discountedPrice: 9_000 + index,
  }));
  const normalized = normalizeAgentOfferSummaries(payload);
  const primary = selectPrimaryEpteraOffers(normalized);
  const formatted = formatEpteraOffersForGuest(
    normalized,
    "2026-09-19",
    "2026-09-20",
  );

  assert.equal(payload.length, 117);
  assert.equal(normalized.length, 90);
  assert.equal(primary.length, roomTypes.length);
  assert.equal((formatted.match(/\*\*/gu) ?? []).length, roomTypes.length * 2);
  assert.doesNotMatch(
    formatted,
    /Гостевой Дом|Корпус 2|Тест|тариф|питание|offerId/u,
  );
  assert.doesNotMatch(formatted, /Комфортный номер|группов|техническ/u);
});

test("does not expose technical test tariffs to the booking agent", () => {
  assert.deepEqual(
    normalizeAgentOfferSummaries([
      { ...offer, id: "test-rate", rateType: "тест тест" },
      offer,
    ]),
    [offer],
  );
});

test("creates a confirmed booking and sends the YooKassa link to chat", async () => {
  const harness = createHarness();
  try {
    await harness.service.reply(
      "conversation-2",
      "Нужен номер с 2026-08-13 по 2026-08-15, 1 взрослый",
    );
    await harness.service.reply("conversation-2", "Да, бронируйте вариант 1");
    assert.equal(harness.reservations.length, 1);
    assert.equal(
      (harness.published.at(-1) as { bookingUrl?: string }).bookingUrl,
      "https://yookassa.test/payment-1",
    );
    assert.match(harness.published.at(-1)?.text ?? "", /30 минут/u);
  } finally {
    globalThis.fetch = harness.originalFetch;
  }
});

test("keeps booking contacts, asks for confirmation, and accepts natural confirmation", async () => {
  const harness = createHarness();
  try {
    await harness.service.reply(
      "conversation-contacts",
      "Нужен номер с 2026-08-13 по 2026-08-15, 1 взрослый",
    );
    await harness.service.reply("conversation-contacts", "Беру вариант 1");
    const knowledgeQueriesBeforeContacts = harness.knowledgeQueries.length;
    const contactMessage = "Дима Наумов, телефон 89525012159";
    await harness.service.reply("conversation-contacts", contactMessage);
    assert.equal(
      harness.knowledgeQueries.length,
      knowledgeQueriesBeforeContacts,
    );
    assert.match(harness.published.at(-1)?.text ?? "", /ещё нужны: email/u);
    assert.doesNotMatch(harness.published.at(-1)?.text ?? "", /имя|фамилию/u);

    await harness.service.reply(
      "conversation-contacts",
      "email d.naymow13@gmail.com",
    );
    assert.equal(
      harness.knowledgeQueries.length,
      knowledgeQueriesBeforeContacts,
    );
    assert.match(
      harness.published.at(-1)?.text ?? "",
      /Подтверждаете создание брони/u,
    );
    assert.doesNotMatch(harness.published.at(-1)?.text ?? "", /укажите имя/u);

    await harness.service.reply("conversation-contacts", "создавай");
    assert.equal(harness.reservations.length, 1);
    assert.equal(
      (harness.published.at(-1) as { bookingUrl?: string }).bookingUrl,
      "https://yookassa.test/payment-1",
    );
  } finally {
    globalThis.fetch = harness.originalFetch;
  }
});

test("extracts names from natural and labeled messages in the booking flow", async () => {
  const harness = createHarness();
  try {
    await harness.service.reply(
      "conversation-screenshot-flow",
      "Нужен номер с 2026-08-13 по 2026-08-15, 1 взрослый",
    );
    await harness.service.reply(
      "conversation-screenshot-flow",
      "Беру вариант 1",
    );
    await harness.service.reply(
      "conversation-screenshot-flow",
      "Дима Наумов, телефон 89525012159",
    );
    assert.match(harness.published.at(-1)?.text ?? "", /ещё нужны: email/u);
    assert.doesNotMatch(harness.published.at(-1)?.text ?? "", /имя|фамилию/u);

    await harness.service.reply(
      "conversation-screenshot-flow",
      "Имя: Дима / Фамилия: Наумов / email: d.naymow13@gmail.com",
    );
    const knowledgeQueriesBeforeConfirmation = harness.knowledgeQueries.length;
    assert.match(
      harness.published.at(-1)?.text ?? "",
      /Подтверждаете создание брони/u,
    );
    assert.doesNotMatch(
      harness.published.at(-1)?.text ?? "",
      /Точной информации|ещё нужны/u,
    );
    await harness.service.reply("conversation-screenshot-flow", "подтверждаю");
    assert.equal(
      harness.knowledgeQueries.length,
      knowledgeQueriesBeforeConfirmation,
    );
    assert.equal(harness.reservations.length, 1);
    const reservation = harness.reservations[0] as {
      contact?: {
        email?: string;
        firstName?: string;
        lastName?: string;
        phone?: string;
      };
    };
    assert.deepEqual(reservation.contact, {
      email: "d.naymow13@gmail.com",
      firstName: "Дима",
      lastName: "Наумов",
      phone: "89525012159",
    });
  } finally {
    globalThis.fetch = harness.originalFetch;
  }
});

test("creates a booking from saved state when the model repeats malformed booking JSON", async () => {
  const harness = createHarness({ malformedConfirmation: true });
  try {
    await harness.service.reply(
      "conversation-malformed-confirmation",
      "Нужен номер с 2026-08-13 по 2026-08-15, 1 взрослый",
    );
    await harness.service.reply(
      "conversation-malformed-confirmation",
      "Беру вариант 1",
    );
    await harness.service.reply(
      "conversation-malformed-confirmation",
      "Дима Наумов, телефон 89525012159",
    );
    await harness.service.reply(
      "conversation-malformed-confirmation",
      "email d.naymow13@gmail.com",
    );
    await harness.service.reply(
      "conversation-malformed-confirmation",
      "подтверждаю",
    );

    assert.equal(harness.reservations.length, 1);
    assert.equal(
      (harness.published.at(-1) as { bookingUrl?: string }).bookingUrl,
      "https://yookassa.test/payment-1",
    );
  } finally {
    globalThis.fetch = harness.originalFetch;
  }
});

test("responds naturally to a greeting without treating it as a knowledge query", async () => {
  const harness = createHarness();
  try {
    await harness.service.reply(
      "conversation-greeting",
      "Какая погода на Марсе?",
    );
    await harness.service.reply("conversation-greeting", "Привет, как дела?");
    assert.equal(
      harness.published.at(-1)?.text,
      "Привет! Спасибо, всё хорошо 🙂 Чем могу помочь?",
    );
    assert.match(
      harness.prompts.at(-1) ?? "",
      /AI-ассистент: Не могу подсказать погоду на Марсе/u,
    );
    assert.match(harness.prompts[0] ?? "", /обычное приветствие/u);
    assert.match(harness.prompts[0] ?? "", /не повторяй прошлый ответ/u);
    assert.doesNotMatch(
      harness.published.at(-1)?.text ?? "",
      /база знаний|менеджер/u,
    );
  } finally {
    globalThis.fetch = harness.originalFetch;
  }
});

test("acknowledges an unknown fact without repeating a canned handoff", async () => {
  const harness = createHarness();
  try {
    await harness.service.reply(
      "conversation-unknown",
      "Какая погода на Марсе?",
    );
    assert.match(
      harness.published.at(-1)?.text ?? "",
      /не могу подсказать погоду на Марсе/iu,
    );
    assert.doesNotMatch(
      harness.published.at(-1)?.text ?? "",
      /передам вопрос менеджеру/u,
    );
  } finally {
    globalThis.fetch = harness.originalFetch;
  }
});

test("answers fixed check-in and check-out times without model generation", async () => {
  const harness = createHarness();
  try {
    await harness.service.reply(
      "conversation-check-in-out",
      "Во сколько у вас заезд и выезд?",
    );
    assert.equal(harness.prompts.length, 0);
    assert.match(
      harness.published.at(-1)?.text ?? "",
      /заезд — в 16:00, выезд — в 14:00/u,
    );
    assert.match(
      harness.published.at(-1)?.text ?? "",
      /не зависит от тарифа или номера/u,
    );
  } finally {
    globalThis.fetch = harness.originalFetch;
  }
});
