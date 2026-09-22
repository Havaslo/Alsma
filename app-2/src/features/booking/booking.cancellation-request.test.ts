import assert from "node:assert/strict";
import test from "node:test";

import type { BookingRepository } from "./booking.repository.js";
import { createBookingService } from "./booking.service.js";
import type { EpteraClient } from "./eptera.client.js";
import type { YooKassaClient } from "./yookassa.client.js";

const paidBooking = (overrides: Record<string, unknown> = {}) => ({
  cancellationRequestedAt: null,
  cancellationStatus: "skipped",
  id: "booking-1",
  paymentStatus: "succeeded",
  refundStatus: "not_started",
  status: "confirmed",
  ...overrides,
});

const createService = (repository: Record<string, unknown>) =>
  createBookingService(
    repository as unknown as BookingRepository,
    {} as EpteraClient,
    {} as YooKassaClient,
  );

test("registers a cancellation request for a paid booking", async () => {
  let input: Record<string, unknown> | undefined;
  const requested = paidBooking({
    cancellationRequestedAt: new Date(),
    cancellationStatus: "requested",
    status: "cancellation_requested",
  });
  const service = createService({
    findBookingForCancellation: async () => paidBooking(),
    requestBookingCancellation: async (value: Record<string, unknown>) => {
      input = value;
      return requested;
    },
  });

  const result = await service.requestCancellation({
    bookingId: "booking-1",
    reason: "Изменились планы",
    userId: "guest-1",
  });

  assert.equal(input?.bookingId, "booking-1");
  assert.equal(input?.reason, "Изменились планы");
  assert.equal(input?.userId, "guest-1");
  assert.equal(result.cancellationStatus, "requested");
  assert.equal(result.status, "cancellation_requested");
});

test("does not register a cancellation request before payment succeeds", async () => {
  let requestCalled = false;
  const service = createService({
    findBookingForCancellation: async () =>
      paidBooking({ paymentStatus: "payment_pending" }),
    requestBookingCancellation: async () => {
      requestCalled = true;
      return null;
    },
  });

  await assert.rejects(
    service.requestCancellation({
      bookingId: "booking-1",
      userId: "guest-1",
    }),
    (error: unknown) =>
      error instanceof Error &&
      "code" in error &&
      error.code === "BOOKING_NOT_PAID",
  );
  assert.equal(requestCalled, false);
});

test("treats a repeated cancellation request as idempotent", async () => {
  let requestCalled = false;
  const existing = paidBooking({
    cancellationRequestedAt: new Date(),
    cancellationStatus: "requested",
    status: "cancellation_requested",
  });
  const service = createService({
    findBookingForCancellation: async () => existing,
    requestBookingCancellation: async () => {
      requestCalled = true;
      return null;
    },
  });

  const result = await service.requestCancellation({
    bookingId: "booking-1",
    userId: "guest-1",
  });

  assert.equal(result, existing);
  assert.equal(requestCalled, false);
});
