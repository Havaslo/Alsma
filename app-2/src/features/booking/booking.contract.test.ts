import assert from "node:assert/strict";
import test from "node:test";

import type { BookingRepository } from "./booking.repository.js";
import {
  type CreateReservationBody,
  createReservationBodySchema,
  offersQuerySchema,
} from "./booking.schemas.js";
import {
  BOOKING_PAYMENT_DEADLINE_MS,
  createBookingService,
} from "./booking.service.js";
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
    getPayment: async (paymentId: string) => ({
      amount: { currency: "RUB", value: "900.00" },
      id: paymentId,
      paid: false,
      status: "pending",
    }),
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

const createSeparateHarness = (failSecondPayment = false) => {
  const reservationIds: string[] = [];
  const paymentIds: string[] = [];
  const paymentAmounts: number[] = [];
  const cancellationIds: number[] = [];
  const bookings: Array<Record<string, unknown>> = [];
  let paymentCalls = 0;
  const repository = {
    createGuestBooking: async (input: Record<string, unknown>) => {
      const booking = {
        ...input,
        cancellationStatus: "not_started",
        epteraPaymentSyncStatus: "pending",
        id: `booking-${bookings.length + 1}`,
        paymentStatus: "payment_pending",
        status: "awaiting_payment",
        totalAmount: input.totalAmount,
      };
      bookings.push(booking);
      return booking;
    },
    updatePayment: async (input: {
      bookingId: string;
      paymentAmount: number;
      paymentId: string;
      paymentStatus: string;
      status: string;
    }) => {
      const booking = bookings.find((item) => item.id === input.bookingId);
      if (!booking) throw new Error("booking missing");
      Object.assign(booking, input);
      return booking;
    },
    markBookingsCancelledAfterPartialFailure: async (input: {
      bookings: Array<{
        bookingId: string;
        cancellationSucceeded: boolean;
        errorCode?: string;
        errorMessage?: string;
      }>;
    }) => {
      for (const cancellation of input.bookings) {
        const booking = bookings.find(
          (item) => item.id === cancellation.bookingId,
        );
        if (!booking) continue;
        Object.assign(booking, {
          cancellationErrorCode: cancellation.errorCode ?? null,
          cancellationErrorMessage: cancellation.errorMessage ?? null,
          cancellationStatus: cancellation.cancellationSucceeded
            ? "succeeded"
            : "failed",
          status: cancellation.cancellationSucceeded
            ? "cancelled"
            : "cancellation_failed",
        });
      }
      return { count: input.bookings.length };
    },
    findOrCreateGuest: async () => ({ id: "guest-1" }),
  } as unknown as BookingRepository;
  const eptera = {
    createReservation: async () => {
      const id = String(123450 + reservationIds.length + 1);
      reservationIds.push(id);
      return { "reservation-id": id };
    },
    cancelReservation: async (reservationId: number) => {
      cancellationIds.push(reservationId);
    },
    getOffers: async () => [
      offer,
      { ...offer, discountedPrice: 1_100, id: "offer-2" },
    ],
  } as unknown as EpteraClient;
  const yookassa = {
    createPayment: async (input: { amount: string }) => {
      paymentCalls += 1;
      if (failSecondPayment && paymentCalls === 2)
        throw new Error("temporary payment creation failure");
      const id = `payment-${paymentCalls}`;
      paymentIds.push(id);
      paymentAmounts.push(Number(input.amount));
      return {
        amount: { currency: "RUB", value: input.amount },
        confirmation: { confirmation_url: `https://example.com/pay/${id}` },
        id,
        paid: false,
        status: "pending",
      };
    },
    getPayment: async (paymentId: string) => ({
      amount: { currency: "RUB", value: "900.00" },
      id: paymentId,
      paid: false,
      status: "pending",
    }),
  } as unknown as YooKassaClient;
  return {
    bookings,
    cancellationIds,
    paymentAmounts,
    paymentIds,
    reservationIds,
    service: createBookingService(repository, eptera, yookassa),
  };
};

test("creates separate payments for separate reservations", async () => {
  const harness = createSeparateHarness();
  const result = await harness.service.createReservation(
    reservationInput({
      adults: 2,
      guests: [adult("Adult 1"), adult("Adult 2")],
      roomCount: 2,
      rooms: [
        { adults: 1, guests: [adult("Adult 1")], offerId: "offer-1" },
        { adults: 1, guests: [adult("Adult 2")], offerId: "offer-2" },
      ],
    }),
  );

  assert.equal(harness.reservationIds.length, 2);
  assert.deepEqual(harness.paymentIds, ["payment-1", "payment-2"]);
  assert.deepEqual(harness.paymentAmounts, [900, 1_100]);
  assert.equal(result.payments?.length, 2);
  assert.deepEqual(
    result.payments?.map((payment) => payment.bookingId),
    ["booking-1", "booking-2"],
  );
  assert.deepEqual(
    result.payments?.map((payment) => payment.confirmationUrl),
    ["https://example.com/pay/payment-1", "https://example.com/pay/payment-2"],
  );
});

test("cancels created unpaid reservations when a later payment fails", async () => {
  const harness = createSeparateHarness(true);

  await assert.rejects(
    harness.service.createReservation(
      reservationInput({
        adults: 2,
        guests: [adult("Adult 1"), adult("Adult 2")],
        roomCount: 2,
        rooms: [
          { adults: 1, guests: [adult("Adult 1")], offerId: "offer-1" },
          { adults: 1, guests: [adult("Adult 2")], offerId: "offer-2" },
        ],
      }),
    ),
    { message: "temporary payment creation failure" },
  );

  assert.deepEqual(harness.reservationIds, ["123451", "123452"]);
  assert.deepEqual(harness.paymentIds, ["payment-1"]);
  assert.deepEqual(harness.cancellationIds, [123451, 123452]);
  assert.deepEqual(
    harness.bookings.map((booking) => [
      booking.status,
      booking.cancellationStatus,
    ]),
    [
      ["cancelled", "succeeded"],
      ["cancelled", "succeeded"],
    ],
  );
});

test("cancels every reservation kept in an incomplete group", async () => {
  const cancelledIds: number[] = [];
  let groupStatus = "cancellation_pending";
  const repository = {
    findExpiredUnpaidGroups: async () => [
      { id: "group-incomplete", paymentId: null },
    ],
    findExpiredUnpaidBookings: async () => [],
    claimGroupCancellation: async () => true,
    findGroup: async () => ({
      bookings: [],
      cancellationStatus: "processing",
      id: "group-incomplete",
      reservationIds: ["123", "456"],
    }),
    markGroupCancelled: async () => {
      groupStatus = "cancelled";
      return { count: 1 };
    },
    markGroupCancellationFailed: async () => ({ count: 1 }),
  } as unknown as BookingRepository;
  const eptera = {
    cancelReservation: async (reservationId: number) => {
      cancelledIds.push(reservationId);
    },
  } as unknown as EpteraClient;
  const service = createBookingService(
    repository,
    eptera,
    {} as YooKassaClient,
  );

  const result = await service.cancelExpiredBookings();

  assert.deepEqual(result, { cancelled: 1, failed: 0, skipped: 0 });
  assert.deepEqual(cancelledIds, [123, 456]);
  assert.equal(groupStatus, "cancelled");
});

test("builds the adult-only Eptera payload without undefined optional fields", async () => {
  assert.equal(BOOKING_PAYMENT_DEADLINE_MS, 30 * 60_000);
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

test("keeps only meal plans except for the Russian bath cottage", async () => {
  const service = createBookingService(
    {} as BookingRepository,
    {
      getOffers: async () => [
        { ...offer, id: "standard-meal", boardType: "FB" },
        { ...offer, id: "standard-no-meal", boardType: "Без питания" },
        {
          ...offer,
          id: "bath-cottage-meal",
          boardType: "Все включено",
          roomType: "Коттедж Русская баня",
        },
        {
          ...offer,
          id: "bath-cottage-no-meal",
          boardType: "Без питания",
          roomType: "Коттедж Русская баня",
        },
      ],
    } as unknown as EpteraClient,
    {} as YooKassaClient,
  );

  const result = await service.offers(
    offersQuerySchema.parse({
      adults: 2,
      checkIn: "2026-08-13",
      checkOut: "2026-08-15",
      children: 0,
      roomCount: 1,
    }),
  );

  assert.deepEqual(
    result.offers.map((item) => item.id),
    ["standard-meal", "bath-cottage-meal", "bath-cottage-no-meal"],
  );
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

test("accepts Eptera nested success response when adding a payment", async () => {
  const originalFetch = globalThis.fetch;
  let requestBody = "";
  globalThis.fetch = (async (input, init) => {
    requestBody = typeof init?.body === "string" ? init.body : "";
    assert.equal(String(input), "https://api.eptera.ru/Execute/SP_WEB_PAYMENT");
    return new Response(
      JSON.stringify([
        [
          {
            MESSAGE: "SP_RES_MAKE_PAYMENT_SUCCESS",
            SUCCESS: 1,
          },
        ],
      ]),
      { headers: { "Content-Type": "application/json" }, status: 200 },
    );
  }) as typeof fetch;

  try {
    await createEpteraClient({
      hotelId: "901016",
      paymentLoginToken: "payment-token",
    }).addPayment({
      amount: 21.62,
      bookingReference: "126349",
      currency: "RUB",
    });

    assert.deepEqual(JSON.parse(requestBody), {
      Action: "Execute",
      ActionTitle: "Deposit Amount From BookingAPI",
      LoginToken: "payment-token",
      Object: "SP_WEB_PAYMENT",
      Parameters: {
        DEPKODU: "94",
        DOVIZKODU: "RUB",
        DOVIZTUTAR: 21.62,
        HESAPKODU: "A",
        HOTELID: 901016,
        KNO: "126349",
        TLTUTAR: 21.62,
      },
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("cancels an expired unpaid Eptera reservation exactly once", async () => {
  const cancelledIds: number[] = [];
  let markCancelledCalls = 0;
  const repository = {
    findExpiredUnpaidBookings: async () => [
      {
        epteraReservationId: "123456",
        id: "booking-expired",
        paymentId: null,
        voucherNumber: null,
      },
    ],
    claimBookingCancellation: async () => true,
    markBookingCancelled: async () => {
      markCancelledCalls += 1;
      return { count: 1 };
    },
    markBookingCancellationFailed: async () => ({ count: 1 }),
  } as unknown as BookingRepository;
  const eptera = {
    cancelReservation: async (reservationId: number) => {
      cancelledIds.push(reservationId);
    },
  } as unknown as EpteraClient;
  const service = createBookingService(
    repository,
    eptera,
    {} as YooKassaClient,
  );

  const result = await service.cancelExpiredBookings({
    limit: 1,
    now: new Date("2026-08-13T12:30:00.000Z"),
  });

  assert.deepEqual(result, { cancelled: 1, failed: 0, skipped: 0 });
  assert.deepEqual(cancelledIds, [123456]);
  assert.equal(markCancelledCalls, 1);
});

test("does not cancel when a payment succeeds during the cancellation claim", async () => {
  let paymentReads = 0;
  let cancelCalled = false;
  let state = {
    cancellationStatus: "processing",
    currency: "RUB",
    epteraPaymentSyncAttemptedAt: null as Date | null,
    epteraPaymentSyncStatus: "pending",
    epteraPaymentSyncedAt: null as Date | null,
    epteraReservationId: "123456",
    id: "booking-race",
    paymentAmount: 900,
    paymentId: "payment-race",
    paymentStatus: "pending",
    status: "cancellation_pending",
    voucherNumber: null,
  };
  const repository = {
    findExpiredUnpaidBookings: async () => [
      {
        epteraReservationId: "123456",
        id: "booking-race",
        paymentId: "payment-race",
        voucherNumber: null,
      },
    ],
    claimBookingCancellation: async () => true,
    findBooking: async () => state,
    findBookingByPaymentId: async () => state,
    markYooKassaPaymentSucceeded: async () => {
      state = {
        ...state,
        cancellationStatus: "skipped",
        paymentStatus: "succeeded",
        status: "payment_sync_pending",
      };
      return state;
    },
    claimEpteraPaymentSync: async () => {
      state = { ...state, epteraPaymentSyncStatus: "processing" };
      return true;
    },
    markEpteraPaymentSyncSucceeded: async () => {
      state = {
        ...state,
        epteraPaymentSyncStatus: "succeeded",
        epteraPaymentSyncedAt: new Date(),
        status: "confirmed",
      };
      return { count: 1 };
    },
    markEpteraPaymentSyncFailed: async () => ({ count: 1 }),
    markBookingCancelled: async () => ({ count: 0 }),
    markBookingCancellationFailed: async () => ({ count: 0 }),
  } as unknown as BookingRepository;
  const eptera = {
    addPayment: async () => undefined,
    cancelReservation: async () => {
      cancelCalled = true;
    },
  } as unknown as EpteraClient;
  const yookassa = {
    getPayment: async () => {
      paymentReads += 1;
      return paymentReads === 1
        ? {
            amount: { currency: "RUB", value: "900.00" },
            id: "payment-race",
            metadata: { bookingId: "booking-race" },
            paid: false,
            status: "pending",
          }
        : {
            amount: { currency: "RUB", value: "900.00" },
            id: "payment-race",
            metadata: { bookingId: "booking-race" },
            paid: true,
            status: "succeeded",
          };
    },
  } as unknown as YooKassaClient;
  const service = createBookingService(repository, eptera, yookassa);

  const result = await service.cancelExpiredBookings();

  assert.equal(cancelCalled, false);
  assert.equal(paymentReads, 2);
  assert.equal(state.status, "confirmed");
  assert.equal(state.epteraPaymentSyncStatus, "succeeded");
  assert.deepEqual(result, { cancelled: 0, failed: 0, skipped: 1 });
});

test("keeps a retryable state when Eptera cancellation fails", async () => {
  let failure: { errorCode: string; errorMessage: string } | undefined;
  const repository = {
    findExpiredUnpaidBookings: async () => [
      {
        epteraReservationId: "123456",
        id: "booking-failure",
        paymentId: null,
        voucherNumber: null,
      },
    ],
    claimBookingCancellation: async () => true,
    markBookingCancelled: async () => ({ count: 0 }),
    markBookingCancellationFailed: async (input: typeof failure) => {
      failure = input;
      return { count: 1 };
    },
  } as unknown as BookingRepository;
  const eptera = {
    cancelReservation: async () => {
      throw new Error("Eptera unavailable");
    },
  } as unknown as EpteraClient;
  const service = createBookingService(
    repository,
    eptera,
    {} as YooKassaClient,
  );

  const result = await service.cancelExpiredBookings();

  assert.deepEqual(result, { cancelled: 0, failed: 1, skipped: 0 });
  assert.equal(failure?.errorCode, "EPTERA_CANCELLATION_FAILED");
  assert.equal(
    failure?.errorMessage,
    "Не удалось автоматически отменить бронь в Eptera.",
  );
});
