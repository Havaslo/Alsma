import assert from "node:assert/strict";
import test from "node:test";

import type { BookingRepository } from "./booking.repository.js";
import type { CreateReservationBody } from "./booking.schemas.js";
import { createBookingService } from "./booking.service.js";
import type { EpteraClient, EpteraOffer } from "./eptera.client.js";
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

const child = (type: "child" | "baby", firstName: string) => ({
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
  childAges: [],
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

const createHarness = (selectedOffer: EpteraOffer = offer) => {
  let createPayload: Record<string, unknown> | undefined;
  let getOffersCalled = false;
  let createReservationCalled = false;

  const eptera = {
    createReservation: async (body: Record<string, unknown>) => {
      createReservationCalled = true;
      createPayload = body;
      return { "reservation-id": "123456" };
    },
    getOffers: async () => {
      getOffersCalled = true;
      return [selectedOffer];
    },
  } as unknown as EpteraClient;
  const repository = {
    createGuestBooking: async (input: {
      id?: string;
      totalAmount: number;
    }) => ({ id: input.id ?? "booking-1", totalAmount: input.totalAmount }),
    findOrCreateGuest: async () => ({ id: "guest-1" }),
    updatePayment: async () => ({
      epteraPaymentSyncAttemptedAt: null,
      epteraPaymentSyncStatus: "pending",
      epteraPaymentSyncedAt: null,
      id: "booking-1",
      totalAmount: 900,
    }),
  } as unknown as BookingRepository;
  const yookassa = {
    createPayment: async () => ({
      amount: { currency: "RUB", value: "900.00" },
      confirmation: { confirmation_url: "https://example.com/pay" },
      id: "payment-1",
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
  };
};

test("builds the adult-only Eptera payload without undefined optional fields", async () => {
  const harness = createHarness();

  await harness.createReservation(reservationInput({ notes: undefined }));

  const payload = harness.createPayload;
  assert.ok(payload);
  assert.deepEqual(JSON.parse(JSON.stringify(payload)), payload);
  assert.equal(payload["res-notes"], "");
  assert.equal(payload["market-id"], 17);
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
  assert.equal(payload["younger-child-count"], 0);
  assert.equal(payload["baby-count"], 0);
  assert.equal(payload["total-price"], 900);
});

test("keeps guest buckets and total price consistent for multiple rooms", async () => {
  const harness = createHarness();

  await harness.createReservation(
    reservationInput({
      adults: 2,
      childAges: [0, 3, 9],
      guests: [
        adult("Adult 1"),
        adult("Adult 2"),
        child("baby", "Baby"),
        child("child", "Child 1"),
        child("child", "Child 2"),
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
  assert.ok(
    (payload["guest-list"] as Array<Record<string, unknown>>).every(
      (guest) => guest.birthday === null,
    ),
  );
});

test("rejects guest bucket mismatches before any Eptera request", async () => {
  const harness = createHarness();

  await assert.rejects(
    harness.createReservation(
      reservationInput({
        childAges: [0],
        guests: [adult("Test"), child("child", "Child")],
      }),
    ),
    { code: "GUESTS_INVALID" },
  );
  assert.equal(harness.getOffersCalled, false);
  assert.equal(harness.createReservationCalled, false);
});
