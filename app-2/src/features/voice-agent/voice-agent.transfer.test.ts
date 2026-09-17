import assert from "node:assert/strict";
import test from "node:test";

import type { Database } from "../../lib/database/database.js";
import { createMangoEventHandler } from "./voice-agent.lifecycle.js";
import type { VoiceAgentRepository } from "./voice-agent.repository.js";
import {
  MangoTransferError,
  buildMangoTransferPayload,
  createVoiceAgentService,
  selectMangoTransferInitiator,
  transferMangoCall,
} from "./voice-agent.service.js";

test("selects only a factual transfer initiator", () => {
  assert.equal(
    selectMangoTransferInitiator({
      mangoTransferInitiator: "10",
    }),
    "10",
  );
  assert.equal(
    selectMangoTransferInitiator({
      mangoTransferInitiator: "to.number",
    }),
    undefined,
  );
  assert.equal(
    selectMangoTransferInitiator({
      mangoTransferInitiator: "from.number",
    }),
    undefined,
  );
});

test("builds a Mango blind-transfer payload without an OpenAI refer target", () => {
  const payload = buildMangoTransferPayload({
    callId: "mango-call",
    destination: "masked-destination",
    initiator: "10",
  });
  assert.equal(payload.call_id, "mango-call");
  assert.equal(payload.method, "blind");
  assert.equal(payload.initiator, "10");
  assert.equal(payload.to_number, "masked-destination");
  assert.match(payload.command_id, /^alsma-transfer-/u);
});

const mangoTransferInput = {
  apiKey: "masked-api-key",
  callId: "mango-call",
  commandId: "alsma-transfer-command",
  destination: "masked-destination",
  initiator: "10",
  salt: "masked-api-salt",
  sleep: async () => undefined,
  readResult: async () => ({ transferState: "accepted", outcome: null }),
} as const;

const mangoResponse = (body: unknown, status = 200) =>
  ({
    json: async () => body,
    ok: status >= 200 && status < 300,
    status,
  }) as Response;

const assertMangoDiagnostic = async ({
  diagnostic,
  responses,
}: {
  readonly diagnostic: string;
  readonly responses: Response[];
}) => {
  const originalFetch = globalThis.fetch;
  let responseIndex = 0;
  globalThis.fetch = async () => {
    const response = responses[responseIndex];
    responseIndex += 1;
    assert.ok(response);
    return response;
  };

  try {
    await assert.rejects(
      transferMangoCall(mangoTransferInput),
      (error: unknown) =>
        error instanceof MangoTransferError && error.diagnostic === diagnostic,
    );
    assert.equal(responseIndex, responses.length);
  } finally {
    globalThis.fetch = originalFetch;
  }
};

test("diagnoses a Mango command HTTP failure without retaining the response body", async () => {
  await assertMangoDiagnostic({
    diagnostic: "mango_transfer_command_http_503",
    responses: [mangoResponse({ secret: "must-not-be-persisted" }, 503)],
  });
});

test("diagnoses a rejected Mango command result", async () => {
  await assertMangoDiagnostic({
    diagnostic: "mango_transfer_command_result_1001",
    responses: [mangoResponse({ result: 1001 })],
  });
});

test("waits for the signed callback result without polling Mango", async () => {
  const originalFetch = globalThis.fetch;
  const urls: string[] = [];
  let reads = 0;
  globalThis.fetch = async (url) => {
    urls.push(String(url));
    return mangoResponse({ result: 0 });
  };
  try {
    const result = await transferMangoCall({
      ...mangoTransferInput,
      readResult: async () => ({
        transferState: ++reads === 1 ? "requested" : "accepted",
        outcome: null,
      }),
    });
    assert.deepEqual(result, {
      commandId: mangoTransferInput.commandId,
      state: "accepted",
    });
    assert.deepEqual(urls, [
      "https://app.mango-office.ru/vpbx/commands/transfer",
    ]);
    assert.equal(reads, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("keeps an accepted command pending when the callback is delayed", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => mangoResponse({ result: 0 });
  try {
    assert.deepEqual(
      await transferMangoCall({
        ...mangoTransferInput,
        readResult: async () => null,
      }),
      { commandId: mangoTransferInput.commandId, state: "requested" },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("reports an asynchronous Mango rejection", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => mangoResponse({ result: 0 });
  try {
    await assert.rejects(
      transferMangoCall({
        ...mangoTransferInput,
        readResult: async () => ({
          transferState: "failed",
          outcome: "mango_transfer_result_4100",
        }),
      }),
      /mango_transfer_result_4100/u,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
