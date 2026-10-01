import assert from "node:assert/strict";
import test from "node:test";

import type { GuestAuthRepository } from "./guest-auth.repository.js";
import { createGuestAuthService } from "./guest-auth.service.js";

const readProfile = (fullNameConfirmedAt: Date | null) => {
  const repository = {
    findSession: async () => ({
      user: {
        bonusProgram: null,
        bookings: [],
        email: "guest@example.com",
        fullName: "Иван Иванов",
        fullNameConfirmedAt,
        id: "guest-1",
        phone: "email:guest@example.com",
        serviceOrders: [],
      },
    }),
  } as unknown as GuestAuthRepository;

  return createGuestAuthService(repository, {}).me("session-token");
};

test("requires existing named profiles to review their name once", async () => {
  const unconfirmed = await readProfile(null);
  const confirmed = await readProfile(new Date());

  assert.equal(unconfirmed.guest?.fullName, "Иван Иванов");
  assert.equal(unconfirmed.guest?.requiresNameCompletion, true);
  assert.equal(confirmed.guest?.requiresNameCompletion, false);
});
