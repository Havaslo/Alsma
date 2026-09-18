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

const createGroupedHarness = (failSecondPayment = false) => {
  const reservationIds: string[] = [];
  const paymentAmounts: number[] = [];
  let group: Record<string, unknown> | null = null;
  let bookings: Array<Record<string, unknown>> = [];
  let paymentCalls = 0;
  const repository = {
    createGuestBookingGroup: async (input: Record<string, unknown>) => {
      group = {
        ...input,
        cancellationStatus: "not_started",
        id: "group-1",
        paymentMethod: "full",
        paymentStatus: "payment_pending",
        status: "creating_reservations",
      };
      return group;
    },
    createGroupBookings: async (input: {
      bookings: Array<Record<string, unknown>>;
      deadline: Date;
      groupId: string;
      reservationIds: unknown;
      totalAmount: number;
    }) => {
      bookings = input.bookings.map((booking, index) => ({
        ...booking,
        cancellationStatus: "not_started",
        epteraPaymentSyncStatus: "pending",
        id: `booking-${index + 1}`,
        paymentStatus: "payment_pending",
        status: "awaiting_payment",
        totalAmount: booking.totalAmount,
      }));
      group = {
        ...group,
        paymentDeadlineAt: input.deadline,
        reservationIds: input.reservationIds,
        status: "awaiting_payment",
        totalAmount: input.totalAmount,
      };
      return group;
    },
    updateGroupPayment: async (input: Record<string, unknown>) => {
      group = { ...group, ...input };
      bookings = bookings.map((booking) => ({
        ...booking,
        paymentStatus: input.paymentStatus,
        status: input.status,
      }));
      return group;
    },
    findGroup: async () => (group ? { ...group, bookings } : null),
    findGroupByPaymentId: async () => (group ? { ...group, bookings } : null),
    markGroupPaymentSucceeded: async (input: {
      bookings: Array<{ id: string; paymentAmount: number }>;
      groupId: string;
      paymentAmount: number;
      paymentId: string;
    }) => {
      if (group?.paymentStatus !== "succeeded") {
        group = {
          ...group,
          paymentAmount: input.paymentAmount,
          paymentId: input.paymentId,
          paymentStatus: "succeeded",
          status: "payment_sync_pending",
        };
        bookings = bookings.map((booking) => ({
          ...booking,
          paymentAmount: input.bookings.find((item) => item.id === booking.id)
            ?.paymentAmount,
          paymentStatus: "succeeded",
          status: "payment_sync_pending",
        }));
      }
      return group ? { ...group, bookings } : null;
    },
    claimEpteraPaymentSync: async (input: { bookingId: string }) => {
      const booking = bookings.find((item) => item.id === input.bookingId);
      if (!booking || booking.epteraPaymentSyncStatus === "succeeded")
        return false;
      booking.epteraPaymentSyncStatus = "processing";
      return true;
    },
    markEpteraPaymentSyncSucceeded: async (input: { bookingId: string }) => {
      const booking = bookings.find((item) => item.id === input.bookingId);
      if (booking) {
        booking.epteraPaymentSyncStatus = "succeeded";
        booking.status = "confirmed";
      }
      return { count: booking ? 1 : 0 };
    },
    markEpteraPaymentSyncFailed: async (input: { bookingId: string }) => {
      const booking = bookings.find((item) => item.id === input.bookingId);
      if (booking) {
        booking.epteraPaymentSyncStatus = "failed";
        booking.status = "payment_sync_failed";
      }
      return { count: booking ? 1 : 0 };
    },
    markGroupConfirmedIfAllSynced: async () => {
      if (
        bookings.every(
          (booking) => booking.epteraPaymentSyncStatus === "succeeded",
        )
      )
        group = { ...group, status: "confirmed" };
      return group ? { ...group, bookings } : null;
    },
    findOrCreateGuest: async () => ({ id: "guest-1" }),
  } as unknown as BookingRepository;
  const eptera = {
    addPayment: async (input: { amount: number }) => {
      paymentAmounts.push(input.amount);
      paymentCalls += 1;
      if (failSecondPayment && paymentCalls === 2)
        throw new Error("temporary payment sync failure");
    },
    createReservation: async () => {
      const id = String(123450 + reservationIds.length + 1);
      reservationIds.push(id);
      return { "reservation-id": id };
    },
    getOffers: async () => [
      offer,
      { ...offer, discountedPrice: 1_100, id: "offer-2" },
    ],
  } as unknown as EpteraClient;
  const yookassa = {
    createPayment: async (input: { amount: string }) => ({
      amount: { currency: "RUB", value: input.amount },
      confirmation: { confirmation_url: "https://example.com/pay" },
      id: "group-payment-1",
      paid: false,
      status: "pending",
    }),
  } as unknown as YooKassaClient;
  return {
    paymentAmounts,
    reservationIds,
    service: createBookingService(repository, eptera, yookassa),
    payment: {
      amount: { currency: "RUB", value: "2000.00" },
      id: "group-payment-1",
      metadata: { bookingId: "group-1" },
      paid: true,
      status: "succeeded",
    },
    setFailSecondPayment: (value: boolean) => {
      failSecondPayment = value;
    },
  };
};

test("creates one payment for separate reservations and retries only failed group syncs", async () => {
  const harness = createGroupedHarness(true);
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
  assert.equal(result.payment.id, "group-payment-1");
  await assert.rejects(harness.service.reconcilePayment(harness.payment), {
    code: "EPTERA_PAYMENT_SYNC_FAILED",
  });
  assert.deepEqual(harness.paymentAmounts, [900, 1_100]);

  harness.setFailSecondPayment(false);
  const confirmed = await harness.service.reconcilePayment(harness.payment);
  assert.equal((confirmed as { status: string }).status, "confirmed");
  assert.deepEqual(harness.paymentAmounts, [900, 1_100, 1_100]);
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
