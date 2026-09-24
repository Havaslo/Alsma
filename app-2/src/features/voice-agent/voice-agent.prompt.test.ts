import assert from "node:assert/strict";
import test from "node:test";

import type { Database } from "../../lib/database/database.js";
import type { EpteraClient } from "../booking/eptera.client.js";
import { voiceTransferInstruction } from "./voice-agent.prompt.js";
import type { VoiceAgentRepository } from "./voice-agent.repository.js";
import { createVoiceAgentService } from "./voice-agent.service.js";
import { voiceAgentTools } from "./voice-agent.tools.js";

const transferTool = voiceAgentTools.find(
  (tool) => tool.name === "transfer_to_manager",
);

test("keeps the voice transfer instruction single and explicit", () => {
  assert.match(
    voiceTransferInstruction,
    /менеджера, сотрудника или оператора/u,
  );
  assert.match(
    voiceTransferInstruction,
    /Одну секунду, соединяю вас с менеджером/u,
  );
  assert.match(
    voiceTransferInstruction,
    /немедленно вызови transfer_to_manager/u,
  );
  assert.match(voiceTransferInstruction, /accepted=true/u);
  assert.match(voiceTransferInstruction, /accepted=false/u);
  assert.doesNotMatch(voiceTransferInstruction, /Проверяю возможность/u);
});

test("keeps the transfer tool contract aligned with the prompt", () => {
  assert.ok(transferTool);
  assert.match(
    transferTool.description,
    /менеджера, сотрудника или оператора/u,
  );
  assert.match(
    transferTool.description,
    /Одну секунду, соединяю вас с менеджером/u,
  );
  assert.match(transferTool.description, /accepted=true/u);
  assert.match(transferTool.description, /accepted=false/u);
  assert.doesNotMatch(transferTool.description, /Проверяю возможность/u);
});

test("uses GPT-6 Luna for voice-agent text answers", async () => {
  const models: string[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_input, init) => {
    const body = JSON.parse(String(init?.body)) as { model?: string };
    if (body.model) models.push(body.model);
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
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("exposes only read-only Eptera tools to voice", async () => {
  const toolNames: readonly string[] = voiceAgentTools.map((tool) => tool.name);
  assert.equal(toolNames.includes("check_availability"), true);
  assert.equal(toolNames.includes("compare_rooms"), true);
  assert.equal(toolNames.includes("create_booking"), false);
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
