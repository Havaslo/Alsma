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

test("does not send legacy initiator literals", async () => {
  const payload = await runCallEvent({
    from: { number: "masked-caller" },
    to: { extension: "to.number", number: "masked-employee" },
  });
  assert.equal(payload.mangoTransferInitiator, "to.number");
  assert.equal(selectMangoTransferInitiator(payload), undefined);
});
