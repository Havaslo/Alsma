import assert from "node:assert/strict";
import test from "node:test";

import { preserveTransferDiagnostic } from "./voice-agent.outcomes.js";

test("keeps a failed Mango transfer diagnostic instead of a later call outcome", () => {
  assert.equal(
    preserveTransferDiagnostic(
      {
        outcome: "mango_transfer_result_4100",
        transferState: "failed",
      },
      "summary",
    ),
    "mango_transfer_result_4100",
  );
});

test("does not preserve a transfer diagnostic after a new attempt starts", () => {
  assert.equal(
    preserveTransferDiagnostic(
      {
        outcome: "mango_transfer_result_4100",
        transferState: "requested",
      },
      "transfer_requested:new-attempt",
    ),
    "transfer_requested:new-attempt",
  );
});
