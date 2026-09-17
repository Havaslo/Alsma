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
