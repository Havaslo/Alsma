import assert from "node:assert/strict";
import test from "node:test";
import type { Logger } from "pino";

import type { Database } from "../../lib/database/database.js";
import { createTravelLineSyncService } from "./travelline-sync.service.js";
import type { TravelLineClient } from "./travelline.client.js";
import { createTravelLineService } from "./travelline.service.js";

const rawBooking = {
  propertyId: "21062",
  number: "20261201-21062-1",
  modifiedDateTime: "2026-11-24T00:00:00Z",
  status: "Active",
  currencyCode: "RUB",
  guaranteeInfo: { totalPrepaid: 0 },
  total: { priceAfterTax: 12000 },
  roomStays: [
    {
      stayDates: {
        arrivalDateTime: "2026-12-01T14:00",
        departureDateTime: "2026-12-03T12:00",
      },
      roomType: { name: "Стандарт" },
      guestCount: { adultCount: 2, childAges: [] },
    },
  ],
};
const harness = () => {
  const queue = new Map<string, { key: string; value: unknown }>();
  let reads = 0;
  let updates = 0;
  let creates = 0;
  let requests = 0;
  let booking: Record<string, unknown> | null = null;
  const provider = {
    propertyId: "21062",
    getBooking: async () => {
      reads++;
      return rawBooking;
    },
  } as unknown as TravelLineClient;
  const service = createTravelLineService(
    {
      enabled: true,
      clientId: "test",
      clientSecret: "secret",
      propertyId: "21062",
    },
    provider,
  );
  const tx = {
    guestUser: { findUnique: async () => ({ id: "guest-1" }) },
    guestBooking: {
      findUnique: async () => booking,
      findFirst: async ({ where }: { where: { userId?: string } }) =>
        booking && (!where.userId || booking.userId === where.userId)
          ? booking
          : null,
      findMany: async () => [],
      create: async ({ data }: { data: Record<string, unknown> }) => {
        creates++;
        booking = { id: "booking-1", ...data };
        return booking;
      },
      update: async ({ data }: { data: Record<string, unknown> }) => {
        updates++;
        booking = { ...booking, ...data };
        return booking;
      },
      updateMany: async ({ data }: { data: Record<string, unknown> }) => {
        updates++;
        booking = { ...booking, ...data };
        return { count: 1 };
      },
    },
    appSetting: {
      createMany: async ({
        data,
      }: {
        data: Array<{ key: string; value: unknown }>;
      }) => {
        data.forEach((x) => {
          if (!queue.has(x.key)) queue.set(x.key, x);
        });
        return { count: data.length };
      },
      findMany: async () =>
        [...queue.values()].filter(
          (x) => (x.value as { status: string }).status === "pending",
        ),
      update: async ({
        where,
        data,
      }: {
        where: { key: string };
        data: { value: unknown };
      }) => {
        queue.set(where.key, { key: where.key, value: data.value });
      },
      upsert: async () => ({}),
      deleteMany: async () => ({ count: 0 }),
    },
    adminRequest: {
      create: async () => {
        requests++;
        return {};
      },
    },
  };
  const database = {
    client: {
      ...tx,
      $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(tx),
    },
  } as unknown as Database;
  return {
    sync: createTravelLineSyncService(database, service, {
      warn: () => {},
    } as unknown as Logger),
    queue,
    stats: () => ({ reads, updates, creates, requests }),
    setBooking: (value: Record<string, unknown> | null) => {
      booking = value;
    },
  };
};

test("webhook duplicates remain processed without fetching or linking an unknown guest", async () => {
  const h = harness();
  const event = {
    eventId: "event-1",
    eventType: "webpms:create_booking",
    creationTime: "2026-11-24T00:00:00Z",
    payload: { PropertyId: "21062", BookingNumber: rawBooking.number },
  };
  await h.sync.acceptEvents([event, event]);
  assert.equal(h.queue.size, 1);
  await h.sync.processPending();
  assert.equal(h.stats().reads, 0);
  assert.equal(h.stats().creates, 0);
  await h.sync.acceptEvents([event]);
  await h.sync.processPending();
  assert.equal(h.stats().reads, 0);
  assert.equal(
    (h.queue.values().next().value?.value as { status: string }).status,
    "processed",
  );
  await assert.rejects(
    h.sync.acceptEvents([
      {
        ...event,
        payload: { PropertyId: "999", BookingNumber: rawBooking.number },
      },
    ]),
    { code: "TRAVELLINE_PROPERTY_MISMATCH" },
  );
});

test("administrator linking refuses a booking belonging to another site guest", async () => {
  const h = harness();
  h.setBooking({
    id: "booking-1",
    userId: "another-guest",
    providerBookingId: rawBooking.number,
  });
  await assert.rejects(
    h.sync.linkBooking("guest-1", rawBooking.number, "admin-1"),
    { code: "TRAVELLINE_BOOKING_ALREADY_LINKED" },
  );
  assert.equal(h.stats().creates, 0);
  assert.equal(h.stats().updates, 0);
});

test("guest cancellation cannot access another user's booking and never cancels at the provider", async () => {
  const h = harness();
  h.setBooking({
    id: "booking-1",
    userId: "guest-1",
    providerBookingId: rawBooking.number,
    cancellationStatus: "not_started",
    status: "reserved",
  });
  await assert.rejects(
    h.sync.requestCancellation("another-guest", "booking-1"),
    { code: "BOOKING_NOT_FOUND" },
  );
  await h.sync.requestCancellation("guest-1", "booking-1", "Изменились планы");
  await h.sync.requestCancellation("guest-1", "booking-1", "Повторный запрос");
  assert.equal(h.stats().requests, 1);
  assert.equal(h.stats().reads, 0);
  assert.equal(h.stats().updates, 1);
});
