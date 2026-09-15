import assert from "node:assert/strict";
import test from "node:test";

import type { Database } from "../../lib/database/database.js";
import { createMangoEventHandler } from "./voice-agent.lifecycle.js";
import type { VoiceAgentRepository } from "./voice-agent.repository.js";
import {
  buildMangoTransferPayload,
  createVoiceAgentService,
  selectMangoTransferInitiator,
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
      mangoTransferInitiator: null,
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

test("transfers a linked Amazi call with the preserved Mango identifiers", async () => {
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
    const repository = {
      claimTransfer: async () => true,
      failTransfer: async () => undefined,
      findCall: async () => ({
        id: "amazi-row",
        mangoCallId: "mango-call-1",
        mangoTransferInitiator:
          "sip:amz-QGAXutRFNlNhpI8bCputsoAq@api.amazi.pro",
        provider: "amazi",
        providerCallId: "amazi:session-1",
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
      callId: "amazi-row",
      name: "transfer_to_manager",
      reason: "guest-request",
    });

    assert.equal((result as { readonly accepted?: boolean }).accepted, true);
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

test("does not send legacy initiator literals", async () => {
  const payload = await runCallEvent({
    from: { number: "masked-caller" },
    to: { extension: "to.number", number: "masked-employee" },
  });
  assert.equal(payload.mangoTransferInitiator, "to.number");
  assert.equal(selectMangoTransferInitiator(payload), undefined);
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
