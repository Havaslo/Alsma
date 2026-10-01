import assert from "node:assert/strict";
import test from "node:test";

import type { Database } from "../../lib/database/database.js";
import { createGuestAuthRepository } from "./guest-auth.repository.js";

test("confirms a profile name only while the confirmation marker is empty", async () => {
  const updateInputs: Array<{
    data: { fullName: string; fullNameConfirmedAt: Date };
    where: { fullNameConfirmedAt: null; id: string };
  }> = [];
  const profile = { id: "guest-1", fullName: "Иван Иванов" };
  const transaction = {
    guestUser: {
      findUniqueOrThrow: async () => profile,
      updateMany: async (input: (typeof updateInputs)[number]) => {
        updateInputs.push(input);
        return { count: 1 };
      },
    },
  };
  const database = {
    client: {
      $transaction: async (
        operation: (transactionClient: typeof transaction) => Promise<unknown>,
      ) => operation(transaction),
    },
  } as unknown as Database;

  const result = await createGuestAuthRepository(database).completeProfile(
    "guest-1",
    "Иван Иванов",
  );

  assert.strictEqual(result, profile);
  assert.equal(updateInputs.length, 1);
  const [updateInput] = updateInputs;
  assert.ok(updateInput);
  assert.deepEqual(updateInput.where, {
    fullNameConfirmedAt: null,
    id: "guest-1",
  });
  assert.equal(updateInput.data.fullName, "Иван Иванов");
  assert.ok(updateInput.data.fullNameConfirmedAt instanceof Date);
});
