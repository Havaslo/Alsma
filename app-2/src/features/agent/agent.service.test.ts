import assert from "node:assert/strict";
import test from "node:test";

import type { Database } from "../../lib/database/database.js";
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
    knowledgeQueryLog: { create: async () => ({}) },
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
    const content = prompt.includes("Да, бронируйте")
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
      : {
          action: "answer",
          answer: "Нашёл вариант и могу сравнить его с другими.",
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
    assert.match(harness.prompts[1] ?? "", /offerId=offer-1/u);
    assert.equal(harness.details().availabilityOffers instanceof Array, true);
  } finally {
    globalThis.fetch = harness.originalFetch;
  }
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
