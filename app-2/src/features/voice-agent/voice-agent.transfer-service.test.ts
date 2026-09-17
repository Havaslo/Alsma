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

const mangoResponse = (body: unknown, status = 200) =>
  ({
    json: async () => body,
    ok: status >= 200 && status < 300,
    status,
  }) as Response;

test("reports a missing employee-side initiator before calling Mango", async () => {
  const repository = {
    findCall: async () => ({
      id: "call-id",
      mangoCallId: "mango-call",
      mangoCallState: "Connected",
      mangoTransferInitiator: null,
      providerEntryId: "entry",
      provider: "mango",
      providerCallId: "mango-call",
      status: "active",
    }),
  } as unknown as VoiceAgentRepository;
  const service = createVoiceAgentService(
    repository,
    {} as Database,
    undefined,
    undefined,
    undefined,
    {
      destination: "masked-destination",
      mangoApiKey: "masked-api-key",
      mangoApiSalt: "masked-api-salt",
    },
  );

  const result = await service.tool({
    callId: "call-id",
    name: "transfer_to_manager",
    reason: "guest-request",
  });
  assert.equal(
    (result as { readonly reason?: string }).reason,
    "mango_transfer_initiator_missing",
  );
});

const runTransferValidation = async (call: Record<string, unknown>) => {
  const originalFetch = globalThis.fetch;
  let mangoRequestCount = 0;
  globalThis.fetch = async () => {
    mangoRequestCount += 1;
    return mangoResponse({ result: 0 });
  };
  try {
    const repository = {
      findCall: async () => call,
      findConnectedMangoCallByProviderEntryId: async (entryId: string) =>
        call.providerEntryId === entryId && call.mangoCallState === "Connected"
          ? call
          : null,
    } as unknown as VoiceAgentRepository;
    const service = createVoiceAgentService(
      repository,
      {} as Database,
      undefined,
      undefined,
      undefined,
      {
        destination: "masked-destination",
        mangoApiKey: "masked-api-key",
        mangoApiSalt: "masked-api-salt",
      },
    );
    const result = await service.tool({
      callId: String(call.id),
      name: "transfer_to_manager",
      reason: "guest-request",
    });
    return { mangoRequestCount, result };
  } finally {
    globalThis.fetch = originalFetch;
  }
};

const completeTransferCall = {
  id: "call-id",
  mangoCallId: "mango-call",
  mangoCallState: "Connected",
  mangoTransferInitiator: "10",
  provider: "amazi",
  providerCallId: "amazi:session-1",
  providerEntryId: "entry-1",
  status: "active",
};

test("rejects transfer before Mango when the call is not Connected", async () => {
  const { mangoRequestCount, result } = await runTransferValidation({
    ...completeTransferCall,
    mangoCallState: "Appeared",
  });
  assert.equal(mangoRequestCount, 0);
  assert.equal(
    (result as { readonly reason?: string }).reason,
    "mango_call_not_connected",
  );
});

test("resolves transfer from the Connected Mango row for the Amazi entry_id", async () => {
  const fetchCalls: Array<{ body: string; url: string }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    fetchCalls.push({
      body: String(init?.body ?? ""),
      url: String(input),
    });
    return {
      ok: true,
      json: async () =>
        String(input).includes("/commands/transfer")
          ? { result: 0 }
          : { result: 1000 },
    } as Response;
  };

  try {
    let requestedEntryId: string | undefined;
    let transferState: string | undefined;
    const repository = {
      findTransferResult: async () => ({
        transferState: "accepted",
        outcome: null,
      }),
      claimTransfer: async () => true,
      failTransfer: async () => undefined,
      findCall: async () => ({
        id: "amazi-row",
        mangoCallId: "unrelated-mango-call",
        mangoCallState: "Appeared",
        mangoTransferInitiator: "wrong-initiator",
        provider: "amazi",
        providerCallId: "amazi:session-1",
        providerEntryId: "entry-1",
        status: "active",
      }),
      findConnectedMangoCallByProviderEntryId: async (entryId: string) => {
        requestedEntryId = entryId;
        return {
          id: "mango-row",
          mangoCallId: "connected-mango-call",
          mangoCallState: "Connected",
          mangoTransferInitiator: "10",
          provider: "mango",
          providerCallId: "connected-mango-call",
          providerEntryId: "entry-1",
          status: "active",
        };
      },
      setTransferCommand: async (
        _callId: string,
        _commandId: string,
        state: "requested" | "accepted",
      ) => {
        transferState = state;
      },
    } as unknown as VoiceAgentRepository;
    const service = createVoiceAgentService(
      repository,
      {} as Database,
      undefined,
      undefined,
      undefined,
      {
        destination: "masked-destination",
        mangoApiKey: "masked-api-key",
        mangoApiSalt: "masked-api-salt",
      },
    );

    const result = await service.tool({
      callId: "amazi-row",
      name: "transfer_to_manager",
      reason: "guest-request",
    });

    assert.equal((result as { readonly accepted?: boolean }).accepted, true);
    assert.equal(requestedEntryId, "entry-1");
    assert.equal(transferState, "requested");
    const transferPayload = JSON.parse(
      new URLSearchParams(fetchCalls[0]?.body).get("json") ?? "{}",
    ) as { call_id?: string; initiator?: string };
    assert.equal(transferPayload.call_id, "connected-mango-call");
    assert.equal(transferPayload.initiator, "10");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("does not use a Connected Mango row from another entry_id", async () => {
  let mangoRequestCount = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    mangoRequestCount += 1;
    return mangoResponse({ result: 0 });
  };
  try {
    const repository = {
      findCall: async () => ({
        ...completeTransferCall,
        mangoCallId: "unrelated-mango-call",
        mangoCallState: "Appeared",
      }),
      findConnectedMangoCallByProviderEntryId: async (entryId: string) => {
        assert.equal(entryId, "entry-1");
        return null;
      },
    } as unknown as VoiceAgentRepository;
    const service = createVoiceAgentService(
      repository,
      {} as Database,
      undefined,
      undefined,
      undefined,
      {
        destination: "masked-destination",
        mangoApiKey: "masked-api-key",
        mangoApiSalt: "masked-api-salt",
      },
    );
    const result = await service.tool({
      callId: "call-id",
      name: "transfer_to_manager",
      reason: "guest-request",
    });

    assert.equal(mangoRequestCount, 0);
    assert.equal(
      (result as { readonly reason?: string }).reason,
      "mango_call_not_connected",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects transfer before Mango when a required Mango identifier is missing", async () => {
  const cases = [
    ["entry_id", { ...completeTransferCall, providerEntryId: undefined }],
    ["call_id", { ...completeTransferCall, mangoCallId: undefined }],
    [
      "initiator",
      { ...completeTransferCall, mangoTransferInitiator: undefined },
    ],
  ] as const;
  for (const [missing, call] of cases) {
    const { mangoRequestCount, result } = await runTransferValidation(call);
    assert.equal(mangoRequestCount, 0, `${missing} must not call Mango`);
    assert.equal(
      (result as { readonly reason?: string }).reason,
      `mango_${missing === "initiator" ? "transfer_initiator" : missing}_missing`,
    );
  }
});

test("transfers a linked Amazi call with the preserved Mango identifiers", async () => {
  const fetchCalls: Array<{ body: string; url: string }> = [];
  const originalFetch = globalThis.fetch;
  let transferState: string | undefined;
  globalThis.fetch = async (input, init) => {
    fetchCalls.push({
      body: String(init?.body ?? ""),
      url: String(input),
    });
    return {
      ok: true,
      json: async () =>
        String(input).includes("/commands/transfer")
          ? { result: 0 }
          : { result: 1000 },
    } as Response;
  };

  try {
    const repository = {
      findTransferResult: async () => ({
        transferState: "accepted",
        outcome: null,
      }),
      claimTransfer: async () => true,
      failTransfer: async () => undefined,
      findCall: async () => ({
        id: "amazi-row",
        mangoCallId: "mango-call-1",
        mangoCallState: "Connected",
        mangoTransferInitiator:
          "sip:amz-QGAXutRFNlNhpI8bCputsoAq@api.amazi.pro",
        providerEntryId: "entry-1",
        provider: "amazi",
        providerCallId: "amazi:session-1",
        status: "active",
      }),
      setTransferCommand: async (
        _callId: string,
        _commandId: string,
        state: "requested" | "accepted",
      ) => {
        transferState = state;
      },
    } as unknown as VoiceAgentRepository;
    const service = createVoiceAgentService(
      repository,
      {} as Database,
      undefined,
      undefined,
      undefined,
      {
        destination: "masked-destination",
        mangoApiKey: "masked-api-key",
        mangoApiSalt: "masked-api-salt",
      },
    );

    const result = await service.tool({
      callId: "amazi-row",
      name: "transfer_to_manager",
      reason: "guest-request",
    });

    assert.equal((result as { readonly accepted?: boolean }).accepted, true);
    assert.equal(transferState, "requested");
    assert.equal(fetchCalls.length, 1);
    const transferPayload = JSON.parse(
      new URLSearchParams(fetchCalls[0]?.body).get("json") ?? "{}",
    ) as { call_id?: string; initiator?: string; to_number?: string };
    assert.equal(transferPayload.call_id, "mango-call-1");
    assert.equal(
      transferPayload.initiator,
      "sip:amz-QGAXutRFNlNhpI8bCputsoAq@api.amazi.pro",
    );
    assert.equal(transferPayload.to_number, "masked-destination");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("persists a safe Mango diagnostic while keeping the public failure state", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => mangoResponse({ result: 1001 });
  let failedOutcome: string | undefined;
  let transferState: string | undefined;

  try {
    const repository = {
      findTransferResult: async () => ({
        transferState: "accepted",
        outcome: null,
      }),
      claimTransfer: async () => true,
      failTransfer: async (_callId: string, outcome: string) => {
        failedOutcome = outcome;
        transferState = "failed";
      },
      findCall: async () => ({
        id: "mango-row",
        mangoCallId: "mango-call-1",
        mangoCallState: "Connected",
        mangoTransferInitiator: "10",
        providerEntryId: "entry-1",
        provider: "mango",
        providerCallId: "mango-call-1",
        status: "active",
      }),
      setTransferCommand: async () => undefined,
    } as unknown as VoiceAgentRepository;
    const service = createVoiceAgentService(
      repository,
      {} as Database,
      undefined,
      undefined,
      undefined,
      {
        destination: "masked-destination",
        mangoApiKey: "masked-api-key",
        mangoApiSalt: "masked-api-salt",
      },
    );

    const result = await service.tool({
      callId: "mango-row",
      name: "transfer_to_manager",
      reason: "guest-request",
    });

    assert.equal((result as { readonly accepted?: boolean }).accepted, false);
    assert.equal(
      (result as { readonly reason?: string }).reason,
      "transfer_failed",
    );
    assert.equal(failedOutcome, "mango_transfer_command_result_1001");
    assert.equal(transferState, "failed");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
