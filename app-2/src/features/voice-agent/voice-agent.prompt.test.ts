import assert from "node:assert/strict";
import test from "node:test";

import type { Database } from "../../lib/database/database.js";
import type { EpteraClient } from "../booking/eptera.client.js";
import {
  getVoiceGreetingInstruction,
  getVoiceStayDateInstruction,
  getVoiceToolFailureInstructions,
  voiceAgentCommunicationInstruction,
  voiceBookingInstruction,
  voiceCallbackInstruction,
} from "./voice-agent.prompt.js";
import type { VoiceAgentRepository } from "./voice-agent.repository.js";
import { createVoiceAgentService } from "./voice-agent.service.js";
import { voiceAgentTools } from "./voice-agent.tools.js";

const callbackTool = voiceAgentTools.find(
  (tool) => tool.name === "request_callback",
);

test("requires explicit consent and records a callback instead of transfer", () => {
  assert.match(voiceCallbackInstruction, /прямой просьбы гостя/u);
  assert.match(voiceCallbackInstruction, /ясного согласия/u);
  assert.match(voiceCallbackInstruction, /вызови request_callback/u);
  assert.match(voiceCallbackInstruction, /одним коротким вопросом.*номер/u);
  assert.match(voiceCallbackInstruction, /не разделяй запрос имени и номера/iu);
  assert.match(
    voiceCallbackInstruction,
    /повтори неизвестный номер для подтверждения/iu,
  );
  assert.match(voiceCallbackInstruction, /удобное время звонка/u);
  assert.match(
    voiceCallbackInstruction,
    /если гость не знает или не хочет сообщать/iu,
  );
  assert.match(voiceCallbackInstruction, /только при accepted=true/u);
  assert.match(voiceCallbackInstruction, /не переводи/iu);
  assert.match(voiceCallbackInstruction, /обратный звонок в рабочее время/u);
});

test("keeps the callback tool contract aligned with the prompt", () => {
  assert.ok(callbackTool);
  assert.match(callbackTool.description, /обратный звонок/u);
  assert.match(callbackTool.description, /после прямой просьбы гостя/u);
  assert.match(callbackTool.description, /одним коротким вопросом/u);
  assert.match(callbackTool.description, /не разделяй имя и номер/iu);
  assert.match(callbackTool.description, /не переключай/iu);
  assert.doesNotMatch(callbackTool.description, /transfer_to_manager/iu);
});

test("checks room availability before offering a callback for booking", () => {
  assert.match(voiceBookingInstruction, /помоги проверить наличие/u);
  assert.match(voiceBookingInstruction, /молча вызови check_availability/u);
  assert.match(voiceBookingInstruction, /подтверждённые сведения/u);
  assert.match(voiceBookingInstruction, /дождись ясного согласия/u);
  assert.match(voiceBookingInstruction, /обратный звонок/u);
  assert.match(
    voiceBookingInstruction,
    /имя и номер для связи неизвестны, запроси их вместе одним вопросом/u,
  );
  assert.match(voiceBookingInstruction, /удобное время звонка/u);
  assert.match(voiceBookingInstruction, /не переводит звонок/u);
  assert.match(
    voiceBookingInstruction,
    /не произноси вступлений и статусов перед вызовом/iu,
  );
  assert.match(
    voiceBookingInstruction,
    /после результата сообщи только подтверждённые сведения/iu,
  );
  assert.match(voiceBookingInstruction, /не говори, что бронь оформлена/u);
  assert.match(
    voiceBookingInstruction,
    /точное распределение гостей нельзя подтвердить/u,
  );
  assert.match(voiceBookingInstruction, /требуется ручное уточнение/u);
  assert.doesNotMatch(voiceBookingInstruction, /Eptera/iu);
});

test("keeps spoken replies concise, Russian, and free of internal provider names", () => {
  assert.match(voiceAgentCommunicationInstruction, /голосовой помощник Алсмы/u);
  assert.match(voiceAgentCommunicationInstruction, /коротким приветствием/u);
  assert.match(voiceAgentCommunicationInstruction, /только по-русски/u);
  assert.match(voiceAgentCommunicationInstruction, /русской интонацией/u);
  assert.match(
    voiceAgentCommunicationInstruction,
    /не произноси внутренние действия/iu,
  );
  assert.match(voiceAgentCommunicationInstruction, /интеграций/u);
  assert.match(voiceAgentCommunicationInstruction, /вызови инструмент молча/u);
  assert.match(voiceAgentCommunicationInstruction, /говори немного быстрее/u);
  assert.match(
    voiceAgentCommunicationInstruction,
    /не повторяй ограничения про оформление брони/u,
  );
  assert.doesNotMatch(
    `${voiceAgentCommunicationInstruction}\n${voiceBookingInstruction}`,
    /Eptera/iu,
  );
});

test("chooses the opening greeting from Moscow local time", () => {
  assert.match(
    getVoiceGreetingInstruction(new Date("2026-10-06T15:00:00Z")),
    /«Добрый вечер»/u,
  );
  assert.match(
    getVoiceGreetingInstruction(new Date("2026-10-06T20:00:00Z")),
    /«Доброй ночи»/u,
  );
  assert.match(
    getVoiceGreetingInstruction(new Date("2026-10-06T06:00:00Z")),
    /«Доброе утро»/u,
  );
  assert.match(
    getVoiceGreetingInstruction(new Date("2026-10-06T11:00:00Z")),
    /«Добрый день»/u,
  );
});

test("uses GPT-6 Luna for voice-agent text answers", async () => {
  const models: string[] = [];
  const systemInstructions: string[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_input, init) => {
    const body = JSON.parse(String(init?.body)) as {
      model?: string;
      messages?: Array<{ content?: string; role?: string }>;
    };
    if (body.model) models.push(body.model);
    const systemMessage = body.messages?.find(
      (message) => message.role === "system",
    );
    if (systemMessage?.content) systemInstructions.push(systemMessage.content);
    return {
      json: async () => ({ choices: [{ message: { content: "Ответ" } }] }),
      ok: true,
    } as Response;
  };
  const service = createVoiceAgentService(
    {
      getAgentSettings: async () => null,
      getKnowledgeContext: async () => "",
    } as unknown as VoiceAgentRepository,
    {} as Database,
    "test-key",
    "https://gateway.test/v1",
  );

  try {
    const result = await service.answer("Какой вопрос?");
    assert.equal(result.answer, "Ответ");
    assert.deepEqual(models, ["gpt-6-luna"]);
    assert.match(systemInstructions[0] ?? "", /вежливо и дружелюбно/u);
    assert.match(systemInstructions[0] ?? "", /без эмодзи/u);
    assert.match(voiceAgentCommunicationInstruction, /вежливо и дружелюбно/u);
    assert.match(voiceAgentCommunicationInstruction, /только по-русски/u);
    assert.match(voiceAgentCommunicationInstruction, /русской интонацией/u);
    assert.match(voiceAgentCommunicationInstruction, /немного быстрее/u);
    assert.match(voiceAgentCommunicationInstruction, /чётко произноси/iu);
    assert.match(voiceAgentCommunicationInstruction, /АЛСМА/u);
    assert.match(voiceAgentCommunicationInstruction, /криолиполиз/u);
    assert.match(voiceAgentCommunicationInstruction, /Васильково/u);
    assert.match(
      voiceAgentCommunicationInstruction,
      /не повторяй вопрос гостя/iu,
    );
    assert.match(
      voiceAgentCommunicationInstruction,
      /сразу вызови инструмент молча и говори только после результата/u,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("exposes only read-only lodging tools and callback requests to voice", async () => {
  const toolNames: readonly string[] = voiceAgentTools.map((tool) => tool.name);
  assert.equal(toolNames.includes("check_availability"), true);
  assert.equal(toolNames.includes("compare_rooms"), true);
  assert.equal(toolNames.includes("create_booking"), false);
  assert.equal(toolNames.includes("create_booking_request"), false);
  assert.equal(toolNames.includes("request_callback"), true);
  assert.equal(toolNames.includes("transfer_to_manager"), false);
  assert.equal(toolNames.includes("create_payment"), false);
  const service = createVoiceAgentService(
    {} as VoiceAgentRepository,
    {} as Database,
    undefined,
    undefined,
    {
      getOffers: async () => [
        {
          benefits: [],
          boardType: "Без питания",
          currency: "RUB",
          discountedPrice: 100,
          id: "offer-1",
          rateDescription: null,
          rateType: "Гибкий",
          roomArea: null,
          roomCapacity: 2,
          roomDescription: null,
          roomImageUrl: null,
          roomImageUrls: [],
          roomType: "Стандарт",
          roomToSell: 1,
          price: 100,
          hotelId: 1,
          marketId: null,
          roomTypeId: 1,
          boardTypeId: 1,
          rateTypeId: 1,
          rateCodeId: 1,
          priceAgencyId: 1,
          roomId: null,
          cancellationPenalty: null,
          roomCount: null,
          bedOptions: null,
        },
      ],
    } as unknown as EpteraClient,
  );
  const result = await service.tool({
    adults: 1,
    checkIn: "2026-08-13",
    checkOut: "2026-08-15",
    childAges: [],
    name: "check_availability",
    roomCount: 1,
  });
  assert.equal((result as { readOnly?: boolean }).readOnly, true);
  assert.equal((result as { available?: boolean }).available, true);
});

test("uses the current Moscow year without asking guests to confirm it", () => {
  const instruction = getVoiceStayDateInstruction(
    new Date("2026-09-29T12:00:00.000Z"),
  );
  assert.match(
    instruction,
    /текущий год по Москве для дат проживания — 2026/iu,
  );
  assert.match(instruction, /не спрашивай год/u);
  assert.match(instruction, /если дата этого года уже прошла/iu);
});

test("offers a callback with consent when availability cannot be checked", () => {
  const instructions = getVoiceToolFailureInstructions({
    available: false,
    reason: "eptera_temporarily_unavailable",
  });
  assert.match(instructions ?? "", /только по-русски/u);
  assert.match(instructions ?? "", /не получается проверить наличие/u);
  assert.match(instructions ?? "", /оставить заявку/u);
  assert.match(instructions ?? "", /не создавай заявку без согласия/u);
  assert.doesNotMatch(instructions ?? "", /Eptera/iu);
  assert.equal(
    getVoiceToolFailureInstructions({ available: false }),
    undefined,
  );
});
