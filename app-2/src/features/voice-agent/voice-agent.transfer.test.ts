import assert from "node:assert/strict";
import test from "node:test";

import { createMangoEventHandler } from "./voice-agent.lifecycle.js";
import type { VoiceAgentRepository } from "./voice-agent.repository.js";
import {
  buildMangoTransferPayload,
  selectMangoTransferInitiator,
} from "./voice-agent.service.js";

test("selects a transfer initiator from Mango participant data", () => {
  assert.equal(
    selectMangoTransferInitiator({
      mangoTransferInitiator: "from.number",
      callerPhone: "masked-in-test",
    }),
    "from.number",
  );
  assert.equal(
    selectMangoTransferInitiator({
      mangoTransferInitiator: null,
      callerPhone: null,
    }),
    undefined,
  );
});

test("builds a Mango blind-transfer payload without an OpenAI refer target", () => {
  const payload = buildMangoTransferPayload({
    callId: "mango-call",
    destination: "masked-destination",
    initiator: "to.number",
  });
  assert.equal(payload.call_id, "mango-call");
  assert.equal(payload.method, "blind");
  assert.equal(payload.initiator, "to.number");
  assert.equal(payload.to_number, "masked-destination");
  assert.match(payload.command_id, /^alsma-transfer-/u);
});

const call = {
  id: "call-id",
  providerSequence: null,
  status: "active",
} as const;

const runCallEvent = async (event: {
  readonly from?: { readonly number: string };
  readonly to?: { readonly number: string };
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
  return buildMangoTransferPayload({
    callId: "mango-call",
    destination: "masked-destination",
    initiator:
      update.mangoTransferInitiator === "to.number"
        ? "to.number"
        : "from.number",
  });
};

test("uses the employee-side to.number for incoming transfer events and payloads", async () => {
  const payload = await runCallEvent({
    from: { number: "masked-caller" },
    to: { number: "masked-employee" },
  });
  assert.equal(payload.initiator, "to.number");
});

test("falls back to from.number when an event has no to participant", async () => {
  const payload = await runCallEvent({ from: { number: "masked-caller" } });
  assert.equal(payload.initiator, "from.number");
});
