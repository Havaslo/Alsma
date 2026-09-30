import assert from "node:assert/strict";
import test from "node:test";

import type { Database } from "../../lib/database/database.js";
import type { EpteraClient } from "../booking/eptera.client.js";
import {
  getVoiceStayDateInstruction,
  getVoiceToolFailureInstructions,
  voiceAgentCommunicationInstruction,
  voiceBookingInstruction,
  voiceTransferInstruction,
} from "./voice-agent.prompt.js";
import type { VoiceAgentRepository } from "./voice-agent.repository.js";
import { createVoiceAgentService } from "./voice-agent.service.js";
import { voiceAgentTools } from "./voice-agent.tools.js";

const transferTool = voiceAgentTools.find(
  (tool) => tool.name === "transfer_to_manager",
);

test("keeps the voice transfer instruction single and explicit", () => {
  assert.match(voiceTransferInstruction, /просьбе гостя забронировать/u);
  assert.match(
    voiceTransferInstruction,
    /Для оформления соединяю вас с менеджером/u,
  );
  assert.match(voiceTransferInstruction, /не спрашивай отдельное согласие/u);
  assert.match(voiceTransferInstruction, /дождись ответа гостя/u);
  assert.match(voiceTransferInstruction, /полностью закончи фразу/u);
  assert.match(voiceTransferInstruction, /accepted=true/u);
  assert.match(voiceTransferInstruction, /accepted=false/u);
  assert.doesNotMatch(voiceTransferInstruction, /Проверяю возможность/u);
});

test("keeps the transfer tool contract aligned with the prompt", () => {
  assert.ok(transferTool);
  assert.match(transferTool.description, /просьбе гостя забронировать/u);
  assert.match(
    transferTool.description,
    /Для оформления соединяю вас с менеджером/u,
  );
  assert.match(transferTool.description, /не спрашивай отдельного согласия/u);
  assert.match(transferTool.description, /дождись ответа/u);
  assert.match(transferTool.description, /accepted=true/u);
  assert.match(transferTool.description, /accepted=false/u);
  assert.doesNotMatch(transferTool.description, /Проверяю возможность/u);
});

test("routes a spoken booking request to the manager without a filler or search", () => {
  assert.match(voiceBookingInstruction, /Сразу скажи/u);
  assert.match(voiceBookingInstruction, /вызови transfer_to_manager/u);
  assert.match(voiceBookingInstruction, /Не вызывай check_availability/u);
  assert.match(voiceBookingInstruction, /не проси отдельного согласия/u);
  assert.match(
    voiceBookingInstruction,
    /не озвучивай внутренние размышления/iu,
  );
  assert.match(
    voiceBookingInstruction,
    /только спрашивает, есть ли свободные номера/u,
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
    assert.match(
      systemInstructions[0] ?? "",
      /тепло, приветливо и уважительно/u,
    );
    assert.match(systemInstructions[0] ?? "", /не используй эмодзи/u);
    assert.match(
      voiceAgentCommunicationInstruction,
      /тепло, приветливо и уважительно/u,
    );
    assert.match(
      voiceAgentCommunicationInstruction,
      /по умолчанию всегда отвечай только по-русски/iu,
    );
    assert.match(
      voiceAgentCommunicationInstruction,
      /нейтральном литературном русском/u,
    );
    assert.match(voiceAgentCommunicationInstruction, /немного медленнее/u);
    assert.match(voiceAgentCommunicationInstruction, /чётко произноси/iu);
    assert.match(voiceAgentCommunicationInstruction, /АЛСМА/u);
    assert.match(voiceAgentCommunicationInstruction, /криолиполиз/u);
    assert.match(voiceAgentCommunicationInstruction, /Васильково/u);
    assert.match(
      voiceAgentCommunicationInstruction,
      /не переходи на английский/iu,
    );
    assert.match(
      voiceAgentCommunicationInstruction,
      /только после прямой и недвусмысленной просьбы гостя/u,
    );
    assert.match(
      voiceAgentCommunicationInstruction,
      /даже если гость произнёс фразу на этом языке/u,
    );
    assert.match(
      voiceAgentCommunicationInstruction,
      /не повторяй вопрос гостя своими словами/iu,
    );
    assert.match(
      voiceAgentCommunicationInstruction,
      /вызови его молча, затем сообщи результат/u,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("exposes only read-only lodging tools and manager transfer to voice", async () => {
  const toolNames: readonly string[] = voiceAgentTools.map((tool) => tool.name);
  assert.equal(toolNames.includes("check_availability"), true);
  assert.equal(toolNames.includes("compare_rooms"), true);
  assert.equal(toolNames.includes("create_booking"), false);
  assert.equal(toolNames.includes("create_booking_request"), false);
  assert.equal(toolNames.includes("transfer_to_manager"), true);
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

test("uses a short Russian fallback when Eptera availability is unavailable", () => {
  const instructions = getVoiceToolFailureInstructions({
    available: false,
    reason: "eptera_temporarily_unavailable",
  });
  assert.match(instructions ?? "", /только по-русски/u);
  assert.match(
    instructions ?? "",
    /не получается проверить актуальное наличие/u,
  );
  assert.match(instructions ?? "", /не произноси английские слова/iu);
  assert.equal(
    getVoiceToolFailureInstructions({ available: false }),
    undefined,
  );
});
