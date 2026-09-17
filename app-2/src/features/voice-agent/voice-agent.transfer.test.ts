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

test("diagnoses a Mango result HTTP failure separately from command success", async () => {
  await assertMangoDiagnostic({
    diagnostic: "mango_transfer_result_http_502",
    responses: [mangoResponse({ result: 0 }), mangoResponse({}, 502)],
  });
});

test("diagnoses an expired Mango result wait when every result is pending", async () => {
  await assertMangoDiagnostic({
    diagnostic: "mango_transfer_timeout",
    responses: [
      mangoResponse({ result: 0 }),
      mangoResponse({ result: 0 }),
      mangoResponse({ result: 0 }),
      mangoResponse({ result: 0 }),
    ],
  });
});

test("accepts a Mango transfer only after result 1000", async () => {
  const originalFetch = globalThis.fetch;
  const responses = [
    mangoResponse({ result: 0 }),
    mangoResponse({ result: 1000 }),
  ];
  let responseIndex = 0;
  globalThis.fetch = async () => responses[responseIndex++] as Response;

  try {
    assert.deepEqual(await transferMangoCall(mangoTransferInput), {
      commandId: "alsma-transfer-command",
    });
    assert.equal(responseIndex, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

const call = {
  id: "call-id",
  providerSequence: null,
  status: "active",
} as const;

const runCallEvent = async (event: {
  readonly from?: {
    readonly number: string;
    readonly extension?: string | number;
  };
  readonly to?: {
    readonly number: string;
    readonly extension?: string | number;
  };
}) => {
  let update: Record<string, unknown> | undefined;
  const repository = {
    findByProviderCallId: async () => call,
    findByMangoCallId: async () => null,
    findByProviderEntryId: async () => null,
    findBySipCallId: async () => null,
    ensureCall: async () => call,
    updateCall: async (_id: string, data: Record<string, unknown>) => {
      update = data;
      return call;
    },
  } as unknown as VoiceAgentRepository;
  const handler = createMangoEventHandler({
    completeCall: async () => undefined,
    repository,
  });

  await handler.handle({
    kind: "call",
    eventKey: "test-event",
    event: {
      call_id: "mango-call",
      call_state: "Connected",
      entry_id: "entry",
      timestamp: 1_700_000_000,
      ...event,
    },
  });

  assert.ok(update);
  return update;
};

test("uses to.extension as the employee-side initiator", async () => {
  const update = await runCallEvent({
    from: { number: "masked-caller" },
    to: { extension: 10, number: "masked-employee" },
  });
  assert.equal(update.mangoTransferInitiator, "10");
  const payload = buildMangoTransferPayload({
    callId: "mango-call",
    destination: "masked-destination",
    initiator: update.mangoTransferInitiator as string,
  });
  assert.equal(payload.initiator, "10");
});

test("falls back to the factual employee-side to.number", async () => {
  const update = await runCallEvent({
    from: { number: "masked-caller" },
    to: { number: "masked-employee" },
  });
  assert.equal(update.mangoTransferInitiator, "masked-employee");
  const payload = buildMangoTransferPayload({
    callId: "mango-call",
    destination: "masked-destination",
    initiator: update.mangoTransferInitiator as string,
  });
  assert.equal(payload.initiator, "masked-employee");
});

test("does not use the caller phone when an employee-side initiator is absent", async () => {
  const update = await runCallEvent({
    from: { number: "masked-caller" },
  });
  assert.equal(update.mangoTransferInitiator, undefined);
});

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
    assert.equal(transferState, "accepted");
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
    assert.equal(transferState, "accepted");
    assert.equal(fetchCalls.length, 2);
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

test("does not send legacy initiator literals", async () => {
  const payload = await runCallEvent({
    from: { number: "masked-caller" },
    to: { extension: "to.number", number: "masked-employee" },
  });
  assert.equal(payload.mangoTransferInitiator, "to.number");
  assert.equal(selectMangoTransferInitiator(payload), undefined);
});

test("does not let an older Mango sequence regress Connected state", async () => {
  let current: Record<string, unknown> = { ...call };
  let updateCount = 0;
  const repository = {
    findByProviderCallId: async () => current,
    findByMangoCallId: async () => null,
    findByProviderEntryId: async () => null,
    findBySipCallId: async () => null,
    ensureCall: async () => current,
    updateCall: async (_id: string, data: Record<string, unknown>) => {
      updateCount += 1;
      current = { ...current, ...data };
      return current;
    },
  } as unknown as VoiceAgentRepository;
  const handler = createMangoEventHandler({
    completeCall: async () => undefined,
    repository,
  });

  await handler.handle({
    kind: "call",
    eventKey: "mango:call:entry:mango-call:2",
    event: {
      call_id: "mango-call",
      call_state: "Connected",
      entry_id: "entry",
      seq: 2,
      timestamp: 1_700_000_002,
    },
  });
  await handler.handle({
    kind: "call",
    eventKey: "mango:call:entry:mango-call:1",
    event: {
      call_id: "mango-call",
      call_state: "Appeared",
      entry_id: "entry",
      seq: 1,
      timestamp: 1_700_000_001,
    },
  });

  assert.equal(current.mangoCallState, "Connected");
  assert.equal(current.providerSequence, 2);
  assert.equal(updateCount, 1);
});

test("prefers the Mango row with the event entry_id over another call_id match", async () => {
  const entryCall = {
    id: "entry-call",
    providerSequence: null,
    status: "active",
  };
  const unrelatedCall = {
    id: "unrelated-call",
    providerSequence: null,
    status: "active",
  };
  let updatedId: string | undefined;
  const repository = {
    findByMangoCallId: async () => unrelatedCall,
    findByProviderCallId: async () => null,
    findByProviderEntryId: async (entryId: string) => {
      assert.equal(entryId, "entry-1");
      return entryCall;
    },
    findBySipCallId: async () => null,
    updateCall: async (id: string) => {
      updatedId = id;
      return entryCall;
    },
  } as unknown as VoiceAgentRepository;
  const handler = createMangoEventHandler({
    completeCall: async () => undefined,
    repository,
  });

  await handler.handle({
    kind: "call",
    eventKey: "mango:call:entry-1:reused-call:1",
    event: {
      call_id: "reused-call",
      call_state: "Connected",
      entry_id: "entry-1",
      seq: 1,
      timestamp: 1_700_000_000,
    },
  });

  assert.equal(updatedId, "entry-call");
});

test("links an Amazi call without caller phone to the nearby Mango call", async () => {
  const amaziCall = {
    id: "amazi-call",
    provider: "amazi",
    providerCallId: "amazi:session-1",
    providerSequence: null,
    status: "active",
  };
  let updatedId: string | undefined;
  let update: Record<string, unknown> | undefined;
  const mangoTimestamp = Math.floor(
    Date.parse("2026-09-15T10:12:41.000Z") / 1_000,
  );
  const repository = {
    findByProviderCallId: async () => null,
    findByMangoCallId: async () => null,
    findByProviderEntryId: async () => null,
    findBySipCallId: async () => null,
    findActiveAmaziCallByCallerPhone: async () => null,
    findUniqueActiveAmaziCallNear: async (at: Date) => {
      assert.ok(Math.abs(at.getTime() - mangoTimestamp * 1_000) <= 1_000);
      return amaziCall;
    },
    ensureCall: async () => {
      throw new Error("A linked Amazi call should be reused");
    },
    updateCall: async (id: string, data: Record<string, unknown>) => {
      updatedId = id;
      update = data;
      return { ...amaziCall, ...data };
    },
  } as unknown as VoiceAgentRepository;
  const handler = createMangoEventHandler({
    completeCall: async () => undefined,
    repository,
  });

  await handler.handle({
    kind: "call",
    eventKey: "mango:call:entry-1:mango-call:1",
    event: {
      call_id: "mango-call",
      call_state: "Connected",
      entry_id: "entry-1",
      from: { number: "79525012159" },
      timestamp: mangoTimestamp,
      seq: 1,
      to: {
        number: "sip:amz-QGAXutRFNlNhpI8bCputsoAq@api.amazi.pro",
      },
    },
  });

  assert.equal(updatedId, "amazi-call");
  assert.equal(update?.mangoCallId, "mango-call");
  assert.equal(
    update?.mangoTransferInitiator,
    "sip:amz-QGAXutRFNlNhpI8bCputsoAq@api.amazi.pro",
  );
  assert.equal(update?.providerEntryId, "entry-1");
  assert.equal(update?.providerSequence, 1);
});

test("uses the same time-safe Amazi fallback for a Mango summary", async () => {
  const amaziCall = {
    id: "amazi-call",
    provider: "amazi",
    providerCallId: "amazi:session-1",
    providerSequence: null,
    status: "active",
  };
  let updatedId: string | undefined;
  let completedId: string | undefined;
  const repository = {
    findByProviderCallId: async () => null,
    findByProviderEntryId: async () => null,
    findBySipCallId: async () => null,
    findActiveAmaziCallByCallerPhone: async () => null,
    findUniqueActiveAmaziCallNear: async () => amaziCall,
    ensureCall: async () => {
      throw new Error("A linked Amazi call should be reused");
    },
    updateCall: async (id: string) => {
      updatedId = id;
      return amaziCall;
    },
  } as unknown as VoiceAgentRepository;
  const handler = createMangoEventHandler({
    completeCall: async (id) => {
      completedId = id;
    },
    repository,
  });

  await handler.handle({
    kind: "summary",
    eventKey: "mango:summary:entry-1:1705313561",
    event: {
      call_direction: 1,
      create_time: 1_700_000_000,
      end_time: 1_700_000_020,
      entry_id: "entry-1",
      entry_result: 1,
    },
  });

  assert.equal(updatedId, "amazi-call");
  assert.equal(completedId, "amazi-call");
});

test("does not merge an Amazi call when the time candidate is ambiguous or absent", async () => {
  const amaziCall = {
    id: "amazi-call",
    provider: "amazi",
    providerCallId: "amazi:session-1",
    providerSequence: null,
    status: "active",
  };
  for (const timeMatch of [null, undefined]) {
    let ensured = false;
    let updatedId: string | undefined;
    const repository = {
      findByProviderCallId: async () => null,
      findByMangoCallId: async () => null,
      findByProviderEntryId: async () => null,
      findBySipCallId: async () => null,
      findActiveAmaziCallByCallerPhone: async () => null,
      findUniqueActiveAmaziCallNear: async () => timeMatch,
      ensureCall: async () => {
        ensured = true;
        return {
          id: "mango-call",
          provider: "mango",
          providerCallId: "mango-call",
          providerSequence: null,
          status: "active",
        };
      },
      updateCall: async (id: string) => {
        updatedId = id;
        return amaziCall;
      },
    } as unknown as VoiceAgentRepository;
    const handler = createMangoEventHandler({
      completeCall: async () => undefined,
      repository,
    });

    await handler.handle({
      kind: "call",
      eventKey: `mango:no-match:${String(timeMatch)}`,
      event: {
        call_id: "mango-call",
        call_state: "Connected",
        entry_id: "entry-1",
        timestamp: 1_700_000_000,
      },
    });

    assert.equal(ensured, true);
    assert.equal(updatedId, "mango-call");
  }
});
