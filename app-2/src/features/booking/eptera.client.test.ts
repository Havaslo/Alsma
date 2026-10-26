import assert from "node:assert/strict";
import test from "node:test";

import { createBookingService } from "./booking.service.js";
import { createEpteraClient } from "./eptera.client.js";

test("disabled Eptera client rejects provider operations without making requests", async () => {
  const originalFetch = globalThis.fetch;
  let requestCount = 0;
  globalThis.fetch = async () => {
    requestCount += 1;
    throw new Error("Eptera must not be contacted while disabled");
  };

  const client = createEpteraClient({
    apiKey: "test-key",
    enabled: false,
    hotelId: "901016",
    paymentLoginToken: "test-payment-token",
    reservationLoginToken: "test-reservation-token",
  });
  const expectDisabled = async (operation: () => unknown) => {
    let caught: unknown;
    try {
      await operation();
    } catch (error) {
      caught = error;
    }
    assert.ok(caught instanceof Error);
    assert.match(caught.message, /временно отключены/u);
  };

  try {
    assert.equal(client.enabled, false);
    await expectDisabled(() =>
      client.getOffers({
        adults: 2,
        checkIn: "2026-10-13",
        checkOut: "2026-10-15",
        childAges: [],
        currency: "RUB",
        language: "ru",
        nationality: "RU",
        roomCount: 1,
      }),
    );
    await expectDisabled(() =>
      client.checkAvailability({
        adults: 2,
        checkIn: "2026-10-13",
        checkOut: "2026-10-15",
        children: [],
        roomCount: 1,
      }),
    );
    await expectDisabled(() => client.createReservation({}));
    await expectDisabled(() => client.cancelReservation(123));
    await expectDisabled(() =>
      client.addPayment({
        amount: 1_000,
        bookingReference: "123",
        currency: "RUB",
      }),
    );
    await expectDisabled(() => client.getReservation("123"));
    assert.equal(requestCount, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("disabled booking endpoints return no provider availability or calendar prices", async () => {
  const client = createEpteraClient({ enabled: false });
  const booking = createBookingService({} as never, client, {} as never);
  const search = {
    adults: 2,
    checkIn: "2026-10-13",
    checkOut: "2026-10-15",
    childAges: [],
    children: 0,
    currency: "RUB",
    language: "ru",
    nationality: "RU",
    roomCount: 1,
  };

  assert.deepEqual(await booking.offers(search), {
    disabled: true,
    offers: [],
    search,
  });
  assert.deepEqual(
    await booking.calendarPrices({ ...search, month: "2026-10" }),
    { items: [] },
  );
});
