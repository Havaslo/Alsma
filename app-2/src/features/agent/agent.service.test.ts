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

const createHarness = () => {
  let details: Record<string, unknown> = {};
  const published: Array<{ text: string; bookingUrl?: string }> = [];
  const bookingSearches: unknown[] = [];
  const knowledgeQueries: string[] = [];
  const reservations: unknown[] = [];
  const prompts: string[] = [];
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
    list: async () => [],
    publish: async (
      _conversationId: string,
      _author: string,
      text: string,
      bookingUrl?: string,
    ) => {
      published.push({ bookingUrl, text });
      return { text };
    },
    publishStatus: () => undefined,
  };
  const booking = {
    offers: async (input: unknown) => {
      bookingSearches.push(input);
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
      messages?: Array<{ content?: string }>;
    };
    const prompt = body.messages?.[0]?.content ?? "";
    prompts.push(prompt);
    const guestMessage = prompt.match(/Сообщение гостя:\s*(.*)$/u)?.[1] ?? "";
    const content = /Да, бронируйте|создавай|подтверждаю/iu.test(guestMessage)
      ? {
          action: "create_booking",
          answer: "Оформляю выбранный вариант.",
          booking: {
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
                "Точной информации по этому вопросу в базе знаний сейчас нет. Передайте вопрос менеджеру, чтобы получить подтверждённый ответ.",
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
    logger: { warn: () => undefined } as never,
  });
  return {
    bookingSearches,
    details: () => details,
    knowledgeQueries,
    originalFetch,
    prompts,
    published,
    reservations,
    service,
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
    assert.match(harness.prompts[1] ?? "", /offerId: offer-1/u);
    assert.equal(harness.details().availabilityOffers instanceof Array, true);
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

test("keeps the knowledge-base fallback for an unrelated unknown question", async () => {
  const harness = createHarness();
  try {
    await harness.service.reply(
      "conversation-unknown",
      "Какая погода на Марсе?",
    );
    assert.match(
      harness.published.at(-1)?.text ?? "",
      /Точной информации по этому вопросу в базе знаний/u,
    );
  } finally {
    globalThis.fetch = harness.originalFetch;
  }
});
