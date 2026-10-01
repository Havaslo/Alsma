import assert from "node:assert/strict";
import test from "node:test";

import { distributeBookingGuests } from "@/lib/booking/booking-guest-distribution";

test("distributes adults and children across two initial booking rooms", () => {
  assert.deepEqual(distributeBookingGuests(4, 3, 2), [
    { adults: 2, children: 2 },
    { adults: 2, children: 1 },
  ]);
});

test("keeps all selected guests in a single booking room", () => {
  assert.deepEqual(distributeBookingGuests(2, 4, 1), [
    { adults: 2, children: 4 },
  ]);
});
