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
import type { YooKassaClient, YooPayment } from "./yookassa.client.js";

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

type BookingState = {
  id: string;
  currency: string;
  totalAmount: number;
  paymentAmount: number | null;
  paymentId: string | null;
  paymentStatus: string;
  status: string;
  epteraReservationPayload: unknown;
  epteraReservationId: string | null;
  voucherNumber: string | null;
  epteraReservationSyncStatus: string;
  epteraReservationSyncAttemptedAt: Date | null;
  epteraReservationSyncedAt: Date | null;
  epteraReservationSyncErrorCode: string | null;
  epteraReservationSyncErrorMessage: string | null;
  epteraPaymentSyncStatus: string;
  epteraPaymentSyncAttemptedAt: Date | null;
  epteraPaymentSyncedAt: Date | null;
  epteraPaymentSyncErrorCode: string | null;
  epteraPaymentSyncErrorMessage: string | null;
};

type HarnessOptions = {
  readonly reservationError?: Error;
  readonly epteraPaymentError?: Error;
  readonly paymentError?: Error;
  readonly repositoryError?: Error;
};

const createHarness = (
  selectedOffer: EpteraOffer = offer,
  options: HarnessOptions = {},
) => {
  let state: BookingState = {
    currency: "RUB",
    epteraPaymentSyncAttemptedAt: null,
    epteraPaymentSyncErrorCode: null,
    epteraPaymentSyncErrorMessage: null,
    epteraPaymentSyncStatus: "pending",
    epteraPaymentSyncedAt: null,
    epteraReservationId: null,
    epteraReservationPayload: null,
    epteraReservationSyncAttemptedAt: null,
    epteraReservationSyncErrorCode: null,
    epteraReservationSyncErrorMessage: null,
    epteraReservationSyncStatus: "pending",
    epteraReservationSyncedAt: null,
    id: "booking-1",
    paymentAmount: null,
    paymentId: null,
    paymentStatus: "payment_pending",
    status: "awaiting_payment",
    totalAmount: 900,
    voucherNumber: null,
  };
  let createReservationCalls = 0;
  let addPaymentCalls = 0;
  let createGuestBookingCalls = 0;
  let paymentCalls = 0;
  let getOffersInput: unknown;

  const eptera = {
    addPayment: async () => {
      addPaymentCalls += 1;
      if (options.epteraPaymentError) throw options.epteraPaymentError;
    },
    createReservation: async () => {
      createReservationCalls += 1;
      if (options.reservationError) throw options.reservationError;
      return { "reservation-id": "123456" };
    },
    getOffers: async (input: unknown) => {
      getOffersInput = input;
      return [selectedOffer];
    },
  } as unknown as EpteraClient;

  const repository = {
    createGuestBooking: async (input: Record<string, unknown>) => {
      createGuestBookingCalls += 1;
      if (options.repositoryError) throw options.repositoryError;
      state = {
        ...state,
        ...(input as Partial<BookingState>),
        id: "booking-1",
        totalAmount: Number(input.totalAmount),
      };
      return state;
    },
    findOrCreateGuest: async () => ({ id: "guest-1" }),
    findBooking: async () => state,
    findBookingByPaymentId: async () => state,
    updatePayment: async (input: {
      paymentAmount: number;
      paymentId: string;
      paymentStatus: string;
      status: string;
    }) => {
      state = { ...state, ...input };
      return state;
    },
    markPaymentCreationFailed: async () => {
      state = {
        ...state,
        paymentStatus: "creation_failed",
        status: "payment_creation_failed",
      };
      return state;
    },
    markYooKassaPaymentSucceeded: async (input: {
      paymentAmount: number;
      paymentId: string;
    }) => {
      state = {
        ...state,
        ...input,
        paymentStatus: "succeeded",
        status: "eptera_reservation_pending",
      };
      return state;
    },
    claimEpteraReservationCreation: async (input: { attemptedAt: Date }) => {
      if (
        state.epteraReservationId ||
        state.epteraReservationSyncStatus !== "pending"
      )
        return false;
      state = {
        ...state,
        epteraReservationSyncAttemptedAt: input.attemptedAt,
        epteraReservationSyncStatus: "processing",
      };
      return true;
    },
    markEpteraReservationCreated: async (input: {
      attemptedAt: Date;
      reservationId: string;
      syncedAt: Date;
      voucherNumber: string | null;
    }) => {
      if (state.epteraReservationSyncAttemptedAt !== input.attemptedAt)
        return { count: 0 };
      state = {
        ...state,
        epteraReservationId: input.reservationId,
        epteraReservationSyncStatus: "succeeded",
        epteraReservationSyncedAt: input.syncedAt,
        status: "eptera_payment_pending",
        voucherNumber: input.voucherNumber,
      };
      return { count: 1 };
    },
    markEpteraReservationSyncFailed: async (input: {
      errorCode: string;
      errorMessage: string;
    }) => {
      state = {
        ...state,
        epteraReservationSyncErrorCode: input.errorCode,
        epteraReservationSyncErrorMessage: input.errorMessage,
        epteraReservationSyncStatus: "failed",
        status: "eptera_reservation_failed",
      };
      return { count: 1 };
    },
    claimEpteraPaymentSync: async (input: { attemptedAt: Date }) => {
      if (
        !state.epteraReservationId ||
        state.epteraPaymentSyncStatus !== "pending"
      )
        return false;
      state = {
        ...state,
        epteraPaymentSyncAttemptedAt: input.attemptedAt,
        epteraPaymentSyncStatus: "processing",
        status: "payment_sync_pending",
      };
      return true;
    },
    markEpteraPaymentSyncSucceeded: async (input: { syncedAt: Date }) => {
      state = {
        ...state,
        epteraPaymentSyncStatus: "succeeded",
        epteraPaymentSyncedAt: input.syncedAt,
        status: "confirmed",
      };
      return { count: 1 };
    },
    markEpteraPaymentSyncFailed: async (input: {
      errorCode: string;
      errorMessage: string;
    }) => {
      state = {
        ...state,
        epteraPaymentSyncErrorCode: input.errorCode,
        epteraPaymentSyncErrorMessage: input.errorMessage,
        epteraPaymentSyncStatus: "failed",
        status: "payment_sync_failed",
      };
      return { count: 1 };
    },
  } as unknown as BookingRepository;

  const yookassa = {
    createPayment: async () => {
      paymentCalls += 1;
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

  const service = createBookingService(repository, eptera, yookassa);
  const paidPayment: YooPayment = {
    amount: { currency: "RUB", value: "900.00" },
    id: "payment-1",
    metadata: { bookingId: "booking-1" },
    paid: true,
    status: "succeeded",
  };
  return {
    createReservation: service.createReservation,
    get state() {
      return state;
    },
    get epteraReservationPayload() {
      return state.epteraReservationPayload;
    },
    get createReservationCalls() {
      return createReservationCalls;
    },
    get addPaymentCalls() {
      return addPaymentCalls;
    },
    get createGuestBookingCalls() {
      return createGuestBookingCalls;
    },
    get paymentCalls() {
      return paymentCalls;
    },
    get getOffersInput() {
      return getOffersInput;
    },
    paidPayment,
    reconcilePayment: service.reconcilePayment,
  };
};

test("stores the Eptera payload and does not create a reservation before payment", async () => {
  const harness = createHarness();

  await harness.createReservation(reservationInput({ notes: undefined }));

  const payload = harness.epteraReservationPayload as Record<string, unknown>;
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
  assert.equal(harness.createReservationCalls, 0);
  assert.equal(harness.createGuestBookingCalls, 1);
  assert.equal(harness.paymentCalls, 1);
});

test("preserves child buckets in the deferred Eptera payload", async () => {
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

  const payload = harness.epteraReservationPayload as Record<string, unknown>;
  assert.equal(payload["total-price"], 25_410);
  assert.equal(payload["elder-child-count"], 1);
  assert.equal(payload["younger-child-count"], 1);
  assert.equal(payload["baby-count"], 0);
  assert.deepEqual(
    (harness.getOffersInput as { childAges: number[] }).childAges,
    [4, 7],
  );
});

test("creates the Eptera reservation and forwards payment only once", async () => {
  const harness = createHarness();
  await harness.createReservation(reservationInput());

  await harness.reconcilePayment(harness.paidPayment);
  await harness.reconcilePayment(harness.paidPayment);

  assert.equal(harness.createReservationCalls, 1);
  assert.equal(harness.addPaymentCalls, 1);
  assert.equal(harness.state.status, "confirmed");
  assert.equal(harness.state.epteraReservationId, "123456");
  assert.equal(harness.state.epteraPaymentSyncStatus, "succeeded");
});

test("keeps a diagnostic failure and does not retry reservation creation", async () => {
  const harness = createHarness(offer, {
    reservationError: new Error("provider unavailable"),
  });
  await harness.createReservation(reservationInput());

  await harness.reconcilePayment(harness.paidPayment);
  await harness.reconcilePayment(harness.paidPayment);

  assert.equal(harness.createReservationCalls, 1);
  assert.equal(harness.addPaymentCalls, 0);
  assert.equal(harness.state.status, "eptera_reservation_failed");
  assert.equal(
    harness.state.epteraReservationSyncErrorCode,
    "EPTERA_RESERVATION_CREATE_FAILED",
  );
});

test("keeps payment transfer failure without retrying a possibly applied payment", async () => {
  const harness = createHarness(offer, {
    epteraPaymentError: new Error("payment provider unavailable"),
  });
  await harness.createReservation(reservationInput());

  await harness.reconcilePayment(harness.paidPayment);
  await harness.reconcilePayment(harness.paidPayment);

  assert.equal(harness.createReservationCalls, 1);
  assert.equal(harness.addPaymentCalls, 1);
  assert.equal(harness.state.status, "payment_sync_failed");
  assert.equal(
    harness.state.epteraPaymentSyncErrorCode,
    "EPTERA_PAYMENT_SYNC_FAILED",
  );
});

test("marks payment creation failure locally without calling Eptera", async () => {
  const harness = createHarness(offer, {
    paymentError: new Error("payment failed"),
  });

  await assert.rejects(harness.createReservation(reservationInput()));
  assert.equal(harness.createReservationCalls, 0);
  assert.equal(harness.state.status, "payment_creation_failed");
  assert.equal(harness.state.paymentStatus, "creation_failed");
});

test("rejects a child birthday after check-in before any provider request", async () => {
  const harness = createHarness();

  await assert.rejects(
    harness.createReservation(
      reservationInput({
        guests: [adult("Test"), child("child", "Child", "2027-01-01")],
      }),
    ),
    { code: "GUESTS_INVALID" },
  );
  assert.equal(harness.createReservationCalls, 0);
  assert.equal(harness.paymentCalls, 0);
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
    await createEpteraClient({
      apiKey: "test-key",
      hotelId: "901016",
    }).createReservation({
      "adult-count": 2,
      "hotel-id": 7,
    });

    assert.equal(
      requests[1]?.url,
      "https://bookingapi.eptera.ru/hotel/901016/createReservation",
    );
    assert.equal(JSON.parse(requests[1]?.body ?? "{}")["hotel-id"], 901016);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
