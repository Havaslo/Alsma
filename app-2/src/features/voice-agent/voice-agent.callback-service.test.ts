import assert from "node:assert/strict";
import test from "node:test";

import type { Database } from "../../lib/database/database.js";
import type { VoiceAgentRepository } from "./voice-agent.repository.js";
import { createVoiceAgentService } from "./voice-agent.service.js";

const createService = (repository: unknown) =>
  createVoiceAgentService(repository as VoiceAgentRepository, {} as Database);

test("persists an agreed callback request using the confirmed caller details", async () => {
  let saved:
    | {
        callId: string;
        guestName?: string;
        phone?: string;
        preferredTime?: string;
        reason: string;
      }
    | undefined;
  const service = createService({
    findByProviderCallId: async () =>
      ({
        id: "00000000-0000-4000-8000-000000000001",
        callerPhone: "+7 900 000-00-00",
      }) as never,
    createCallbackRequest: async (
      callId: string,
      input: {
        guestName?: string;
        phone?: string;
        preferredTime?: string;
        reason: string;
      },
    ) => {
      saved = { callId, ...input };
      return { accepted: true, requestId: "request-id", status: "pending" };
    },
  });

  const result = await service.toolForProviderCall(
    "provider-call-id",
    "request_callback",
    {
      guestName: "Анна",
      preferredTime: "Завтра после 12:00",
      reason: "Оформить бронирование",
      phone: "+7 900 000-00-00",
    },
  );

  assert.deepEqual(result, {
    accepted: true,
    requestId: "request-id",
    status: "pending",
  });
  assert.deepEqual(saved, {
    callId: "00000000-0000-4000-8000-000000000001",
    guestName: "Анна",
    phone: "+7 900 000-00-00",
    preferredTime: "Завтра после 12:00",
    reason: "Оформить бронирование",
  });
});

test("rejects the retired manager-transfer action without contacting Mango", async () => {
  let mangoCommands = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    mangoCommands += 1;
    return new Response("{}", { status: 200 });
  };
  try {
    const service = createService({
      findByProviderCallId: async () => ({ id: "call-id" }) as never,
    });
    const result = await service.toolForProviderCall(
      "provider-call-id",
      "transfer_to_manager",
      { reason: "guest-request" },
    );

    assert.deepEqual(result, {
      accepted: false,
      reason: "invalid_tool_arguments",
    });
    assert.equal(mangoCommands, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
