import assert from "node:assert/strict";
import test from "node:test";

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
    initiator: "from.number",
  });
  assert.equal(payload.call_id, "mango-call");
  assert.equal(payload.method, "blind");
  assert.equal(payload.initiator, "from.number");
  assert.equal(payload.to_number, "masked-destination");
  assert.match(payload.command_id, /^alsma-transfer-/u);
});
