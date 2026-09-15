import assert from "node:assert/strict";
import test from "node:test";

import type { BookingRepository } from "./booking.repository.js";
import {
  type CreateReservationBody,
  createReservationBodySchema,
  offersQuerySchema,
} from "./booking.schemas.js";
import { createBookingService } from "./booking.service.js";
import {
  type EpteraClient,
  type EpteraOffer,
  createEpteraClient,
} from "./eptera.client.js";
import type { YooKassaClient } from "./yookassa.client.js";

const offer: EpteraOffer = {
  id: "offer-1",
  hotelId: 901011,
  marketId: 17,
  roomTypeId: 11,
  roomType: "Standard",
  boardTypeId: 22,
  boardType: "Breakfast",
  rateTypeId: 33,
  rateType: "Flexible",
  rateCodeId: 44,
  priceAgencyId: 55,
  roomId: 77,
  currency: "RUB",
  price: 1_000,
  discountedPrice: 900,
  roomToSell: 5,
  cancellationPenalty: null,
  rateDescription: null,
  benefits: [],
  roomImageUrl: null,
  roomImageUrls: [],
  roomArea: null,
  roomCount: null,
  roomCapacity: null,
  roomDescription: null,
  bedOptions: null,
};

const adult = (firstName: string) => ({
  firstName,
  lastName: "Testov",
  type: "adult" as const,
});

const child = (
  type: "child" | "baby",
  firstName: string,
  birthDate = "2016-04-12",
) => ({
  birthDate,
  firstName,
  lastName: "Testov",
  type,
});

const reservationInput = (
  overrides: Partial<CreateReservationBody> = {},
): CreateReservationBody => ({
  adults: 1,
  checkIn: "2026-08-13",
  checkOut: "2026-08-15",
  contact: {
    email: "guest@example.com",
    firstName: "Test",
    lastName: "Testov",
    phone: "+79990000000",
  },
  currency: "RUB",
  guests: [adult("Test")],
  nationality: "RU",
  offerId: offer.id,
  paymentMethod: "full",
  returnUrl: "https://example.com/booking/return",
  roomCount: 1,
  ...overrides,
});

type HarnessOptions = {
  readonly cancellationError?: Error;
  readonly createResponse?: unknown;
  readonly repositoryError?: Error;
  readonly paymentError?: Error;
};

const createHarness = (
  selectedOffer: EpteraOffer = offer,
  options: HarnessOptions = {},
) => {
  let createPayload: Record<string, unknown> | undefined;
  let getOffersCalled = false;
  let getOffersInput: unknown;
  let createReservationCalled = false;
  let createGuestBookingCalled = false;
  let findOrCreateGuestCalled = false;
  let paymentCalled = false;
  const cancellationIds: number[] = [];

  const eptera = {
    createReservation: async (body: Record<string, unknown>) => {
      createReservationCalled = true;
      createPayload = body;
      return options.createResponse ?? { "reservation-id": "123456" };
    },
    cancelReservation: async (reservationId: number) => {
      cancellationIds.push(reservationId);
      if (options.cancellationError) throw options.cancellationError;
    },
    getOffers: async (input: unknown) => {
      getOffersCalled = true;
      getOffersInput = input;
      return [selectedOffer];
    },
  } as unknown as EpteraClient;
  const repository = {
    createGuestBooking: async (input: { id?: string; totalAmount: number }) => {
      createGuestBookingCalled = true;
      if (options.repositoryError) throw options.repositoryError;
      return { id: input.id ?? "booking-1", totalAmount: input.totalAmount };
    },
    findOrCreateGuest: async () => {
      findOrCreateGuestCalled = true;
      return { id: "guest-1" };
    },
    updatePayment: async () => ({
      epteraPaymentSyncAttemptedAt: null,
      epteraPaymentSyncStatus: "pending",
      epteraPaymentSyncedAt: null,
      id: "booking-1",
      totalAmount: 900,
    }),
  } as unknown as BookingRepository;
  const yookassa = {
    createPayment: async () => {
      paymentCalled = true;
      if (options.paymentError) throw options.paymentError;
      return {
        amount: { currency: "RUB", value: "900.00" },
        confirmation: { confirmation_url: "https://example.com/pay" },
        id: "payment-1",
        paid: false,
        status: "pending",
      };
    },
  } as unknown as YooKassaClient;

  return {
    createReservation: createBookingService(repository, eptera, yookassa)
      .createReservation,
    get createPayload() {
      return createPayload;
    },
    get createReservationCalled() {
      return createReservationCalled;
    },
    get getOffersCalled() {
      return getOffersCalled;
    },
    get getOffersInput() {
      return getOffersInput;
    },
    get createGuestBookingCalled() {
      return createGuestBookingCalled;
    },
    get findOrCreateGuestCalled() {
      return findOrCreateGuestCalled;
    },
    get paymentCalled() {
      return paymentCalled;
    },
    get cancellationIds() {
      return cancellationIds;
    },
  };
};

test("builds the adult-only Eptera payload without undefined optional fields", async () => {
  const harness = createHarness();

  await harness.createReservation(reservationInput({ notes: undefined }));

  const payload = harness.createPayload;
  assert.ok(payload);
  assert.deepEqual(JSON.parse(JSON.stringify(payload)), payload);
  assert.deepEqual(Object.keys(payload).sort(), [
    "adult-count",
    "baby-count",
    "board-type-id",
    "check-in",
    "check-out",
    "currency-code",
    "elder-child-count",
    "guest-list",
    "nationality",
    "price-agency-id",
    "rate-type-id",
    "room-type-id",
    "total-price",
    "younger-child-count",
  ]);
  assert.deepEqual(payload["guest-list"], [
    {
      birthday: null,
      country: "RU",
      name: "Test",
      surname: "Testov",
      "title-id": 0,
    },
  ]);
  assert.equal(payload["elder-child-count"], 0);
  assert.equal(payload["baby-count"], 0);
  assert.equal(payload["younger-child-count"], 0);
  assert.equal(payload["total-price"], 900);
});

test("uses the fresh quote total and child buckets for two adults aged 4 and 7", async () => {
  const harness = createHarness({
    ...offer,
    discountedPrice: 0,
    price: 25_410,
  });

  await harness.createReservation(
    reservationInput({
      adults: 2,
      guests: [
        adult("Adult 1"),
        adult("Adult 2"),
        child("child", "Child 4", "2022-04-12"),
        child("child", "Child 7", "2019-04-12"),
      ],
    }),
  );

  const payload = harness.createPayload;
  assert.ok(payload);
  assert.equal(payload["total-price"], 25_410);
  assert.equal(payload["elder-child-count"], 1);
  assert.equal(payload["younger-child-count"], 1);
  assert.equal(payload["baby-count"], 0);
  assert.deepEqual(
    (harness.getOffersInput as { childAges: number[] }).childAges,
    [4, 7],
  );
  assert.deepEqual(
    (payload["guest-list"] as Array<Record<string, unknown>>).map(
      (guest) => guest["title-id"],
    ),
    [0, 0, 2, 2],
  );
});

test("keeps guest buckets and total price consistent for multiple rooms", async () => {
  const harness = createHarness();

  await harness.createReservation(
    reservationInput({
      adults: 2,
      guests: [
        adult("Adult 1"),
        adult("Adult 2"),
        child("child", "Baby", "2026-08-01"),
        child("child", "Child 1", "2023-07-08"),
        child("child", "Child 2", "2015-11-09"),
      ],
      roomCount: 2,
    }),
  );

  const payload = harness.createPayload;
  assert.ok(payload);
  assert.deepEqual(JSON.parse(JSON.stringify(payload)), payload);
  assert.equal(payload["total-price"], 1_800);
  assert.equal(payload["elder-child-count"], 1);
  assert.equal(payload["younger-child-count"], 1);
  assert.equal(payload["baby-count"], 1);
  assert.equal((payload["guest-list"] as unknown[]).length, 5);
  assert.deepEqual(
    (payload["guest-list"] as Array<Record<string, unknown>>).map(
      (guest) => guest.birthday,
    ),
    [null, null, "2026-08-01", "2023-07-08", "2015-11-09"],
  );
  assert.deepEqual(
    (payload["guest-list"] as Array<Record<string, unknown>>).map(
      (guest) => guest["title-id"],
    ),
    [0, 0, 3, 2, 2],
  );
});

test("rejects a child birthday after check-in before any Eptera request", async () => {
  const harness = createHarness();

  await assert.rejects(
    harness.createReservation(
      reservationInput({
        guests: [adult("Test"), child("child", "Child", "2027-01-01")],
      }),
    ),
    { code: "GUESTS_INVALID" },
  );
  assert.equal(harness.getOffersCalled, false);
  assert.equal(harness.createReservationCalled, false);
});

test("requires real birth dates for child and baby guests", () => {
  const base = reservationInput();
  assert.throws(() =>
    createReservationBodySchema.parse({
      ...base,
      guests: [adult("Test"), child("child", "Child", "2024-02-30")],
    }),
  );
  assert.throws(() =>
    createReservationBodySchema.parse({
      ...base,
      guests: [
        adult("Test"),
        { firstName: "Child", lastName: "Testov", type: "child" },
      ],
    }),
  );
});

test("keeps count-only searches free of invented child ages", async () => {
  let offersInput: unknown;
  const query = offersQuerySchema.parse({
    adults: "2",
    checkIn: "2026-08-13",
    checkOut: "2026-08-15",
    children: "2",
    roomCount: "2",
  });
  const service = createBookingService(
    {} as BookingRepository,
    {
      getOffers: async (input: unknown) => {
        offersInput = input;
        return [];
      },
    } as unknown as EpteraClient,
    {} as YooKassaClient,
  );

  await service.offers(query);

  assert.deepEqual((offersInput as { childAges: number[] }).childAges, []);
  assert.equal(query.children, 2);
  assert.equal(query.roomCount, 2);
});

test("rejects an offer with fewer rooms to sell than requested", async () => {
  const harness = createHarness({ ...offer, roomToSell: 1 });

  await assert.rejects(
    harness.createReservation(reservationInput({ roomCount: 2 })),
    { code: "OFFER_UNAVAILABLE" },
  );
  assert.equal(harness.createReservationCalled, false);
});

test("rejects a create response without a reservation identifier", async () => {
  const harness = createHarness(offer, { createResponse: {} });

  await assert.rejects(harness.createReservation(reservationInput()), {
    code: "EPTERA_RESPONSE_INVALID",
  });
  assert.equal(harness.findOrCreateGuestCalled, false);
  assert.equal(harness.createGuestBookingCalled, false);
  assert.equal(harness.paymentCalled, false);
});

test("cancels Eptera reservation when local persistence fails", async () => {
  const persistenceError = new Error("database failed");
  const harness = createHarness(offer, { repositoryError: persistenceError });

  await assert.rejects(
    harness.createReservation(reservationInput()),
    (error) => error === persistenceError,
  );
  assert.deepEqual(harness.cancellationIds, [123456]);
});

test("keeps the payment error when best-effort cancellation also fails", async () => {
  const paymentError = new Error("payment failed");
  const harness = createHarness(offer, {
    cancellationError: new Error("cancel failed"),
    paymentError,
  });

  await assert.rejects(
    harness.createReservation(reservationInput()),
    (error) => error === paymentError,
  );
  assert.deepEqual(harness.cancellationIds, [123456]);
});

test("always uses the configured hotel id for createReservation", async () => {
  const originalFetch = globalThis.fetch;
  const requests: Array<{ body: string; url: string }> = [];
  globalThis.fetch = (async (input, init) => {
    requests.push({
      body: typeof init?.body === "string" ? init.body : "",
      url: String(input),
    });
    if (String(input).endsWith("/login")) {
      return new Response(
        JSON.stringify({
          "allowed-hotel-ids": [901016],
          jwt: "test-session-token",
          success: true,
        }),
        { headers: { "Content-Type": "application/json" }, status: 200 },
      );
    }
    return new Response(JSON.stringify({ "reservation-id": 125853 }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  }) as typeof fetch;

  try {
    const reservationPayload = {
      "adult-count": 2,
      "board-type-id": 22,
      "check-in": "2026-08-13",
      "check-out": "2026-08-15",
      "currency-code": "RUB",
      "elder-child-count": 1,
      "guest-list": [
        {
          birthday: null,
          country: "RU",
          name: "Adult 1",
          surname: "Testov",
          "title-id": 0,
        },
        {
          birthday: "2022-04-12",
          country: "RU",
          name: "Child 4",
          surname: "Testov",
          "title-id": 2,
        },
      ],
      nationality: "RU",
      "price-agency-id": 55,
      "rate-type-id": 33,
      "room-type-id": 11,
      "total-price": 25_410,
      "younger-child-count": 1,
    };
    await createEpteraClient({
      apiKey: "test-key",
      hotelId: "901016",
    }).createReservation({
      ...reservationPayload,
      "hotel-id": 7,
    });

    assert.equal(
      requests[1]?.url,
      "https://bookingapi.eptera.ru/hotel/901016/createReservation",
    );
    assert.deepEqual(JSON.parse(requests[1]?.body ?? "{}"), {
      ...reservationPayload,
      "hotel-id": 901016,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
