import assert from "node:assert/strict";
import test from "node:test";

import type { BookingRepository } from "./booking.repository.js";
import { createBookingService } from "./booking.service.js";
import type { EpteraClient } from "./eptera.client.js";
import type { YooKassaClient, YooRefund } from "./yookassa.client.js";

const refund = (status: string): YooRefund => ({
  amount: { currency: "RUB", value: "107.10" },
  id: "refund-1",
  paymentId: "payment-1",
  status,
});

test("records a successful hotel refund without starting a new refund", async () => {
  const booking = {
    id: "booking-1",
    paymentId: "payment-1",
    refundStatus: "pending",
  };
  let saved: Record<string, unknown> | undefined;
  const repository = {
    findBookingByPaymentId: async () => booking,
    findBookingByRefundId: async () => null,
    findGroupByPaymentId: async () => null,
    findGroupByRefundId: async () => null,
    findBooking: async () => ({ ...booking, ...saved }),
    markBookingRefundSucceeded: async (input: Record<string, unknown>) => {
      saved = { ...input, refundStatus: "succeeded" };
      return { count: 1 };
    },
  } as unknown as BookingRepository;
  const service = createBookingService(
    repository,
    {} as EpteraClient,
    {} as YooKassaClient,
  );

  await service.reconcileRefund(refund("succeeded"));

  assert.deepEqual(saved, {
    bookingId: "booking-1",
    refundAmount: 107.1,
    refundId: "refund-1",
    refundedAt: saved?.refundedAt,
    refundStatus: "succeeded",
  });
});

test("records a failed hotel refund notification without retrying it", async () => {
  const booking = { id: "booking-1", paymentId: "payment-1" };
  let failure: Record<string, unknown> | undefined;
  const repository = {
    findBookingByPaymentId: async () => booking,
    findBookingByRefundId: async () => null,
    findGroupByPaymentId: async () => null,
    findGroupByRefundId: async () => null,
    findBooking: async () => ({ ...booking, ...failure }),
    markBookingRefundFailed: async (input: Record<string, unknown>) => {
      failure = input;
      return { count: 1 };
    },
  } as unknown as BookingRepository;
  const service = createBookingService(
    repository,
    {} as EpteraClient,
    {} as YooKassaClient,
  );

  await service.reconcileRefund(refund("canceled"));

  assert.equal(failure?.bookingId, "booking-1");
  assert.equal(failure?.refundId, "refund-1");
  assert.equal(failure?.errorCode, "YOOKASSA_REFUND_CANCELED");
});
