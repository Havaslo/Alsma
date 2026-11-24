import assert from "node:assert/strict";
import test from "node:test";

import { createTravelLineClient } from "./travelline.client.js";
import {
  createTravelLineService,
  travelLineBookingSnapshot,
  travelLineBookingUrl,
} from "./travelline.service.js";

const credentials = {
  clientId: "test",
  clientSecret: "secret",
  propertyId: "21062",
  enabled: true,
};
const booking = {
  propertyId: "21062",
  number: "20261201-21062-1",
  status: "Active",
  modifiedDateTime: "2026-11-24T00:00:00Z",
  currencyCode: "RUB",
  guaranteeInfo: { totalPrepaid: 1000 },
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

test("handoff retains dates/guests, never sends guest identity or invents room selection", () => {
  const url = new URL(
    travelLineBookingUrl("https://booking.example/reserve", {
      checkIn: "2026-12-01",
      checkOut: "2026-12-03",
      adults: 2,
      childAges: [4, 8],
    }),
  );
  assert.equal(url.searchParams.get("date"), "2026-12-01");
  assert.equal(url.searchParams.get("nights"), "2");
  assert.equal(url.searchParams.get("children-age"), "4,8");
  assert.equal(url.searchParams.has("room-type"), false);
  const noChildren = new URL(
    travelLineBookingUrl(
      "https://booking.example?children=2&children-age=7,9",
      { checkIn: "2026-12-01", checkOut: "2026-12-03", adults: 2 },
    ),
  );
  assert.equal(noChildren.searchParams.get("children"), "0");
  assert.equal(noChildren.searchParams.has("children-age"), false);
  assert.throws(() => travelLineBookingUrl("http://booking.example"));
  assert.throws(() =>
    travelLineBookingUrl("https://user:password@booking.example"),
  );
  assert.throws(() =>
    travelLineBookingUrl("https://booking.example", {
      checkIn: "2026-12-03",
      checkOut: "2026-12-01",
      adults: 2,
    }),
  );
});

test("single-room offers join actual names, preserve separate check-in taxes and reject unsupported multi-room search", async () => {
  const client = createTravelLineClient({
    ...credentials,
    fetcher: async (url) => {
      if (String(url).endsWith("/auth/token"))
        return Response.json({ access_token: "test", expires_in: 900 });
      if (String(url).includes("/content/"))
        return Response.json({
          id: "21062",
          name: "Алсма",
          roomTypes: [
            {
              id: "1",
              name: "Стандарт",
              images: [{ url: "https://images.example/room.jpg" }],
            },
          ],
          ratePlans: [{ id: "2", name: "Все включено" }],
        });
      return Response.json({
        roomStays: [
          {
            propertyId: "21062",
            roomType: { id: "1" },
            ratePlan: { id: "2" },
            guestCount: { adultCount: 2, childAges: [] },
            stayDates: {
              arrivalDateTime: "2026-12-01T14:00",
              departureDateTime: "2026-12-03T12:00",
            },
            availability: 2,
            currencyCode: "RUB",
            total: { priceBeforeTax: 12000, taxAmount: 240 },
            cancellationPolicy: null,
          },
        ],
      });
    },
  });
  const service = createTravelLineService(credentials, client);
  const search = {
    checkIn: "2026-12-01",
    checkOut: "2026-12-03",
    adults: 2,
    roomCount: 1,
  };
  const result = await service.getOffers(search);
  assert.equal(result[0]?.roomType, "Стандарт");
  assert.equal(result[0]?.rateType, "Все включено");
  assert.equal(result[0]?.price, 12000);
  assert.match(result[0]?.benefits[0] ?? "", /240 RUB/u);
  assert.equal(result[0]?.roomImageUrl, "https://images.example/room.jpg");
  await assert.rejects(service.getOffers({ ...search, roomCount: 2 }), {
    code: "TRAVELLINE_MULTIROOM_CHECKOUT_REQUIRED",
  });
  assert.throws(() => service.checkoutUrl(search), {
    code: "TRAVELLINE_MODULE_NOT_CONFIGURED",
  });
});

test("reservation state does not claim paid or cancelled before provider confirmation", () => {
  const active = travelLineBookingSnapshot(booking);
  assert.equal(active.provider, "travelline");
  assert.equal(active.providerBookingId, booking.number);
  assert.equal(active.status, "reserved");
  assert.equal(active.paymentStatus, "partially_paid");
  assert.equal(active.checkInDate.toISOString(), "2026-12-01T00:00:00.000Z");
  const cancelled = travelLineBookingSnapshot({
    ...booking,
    status: "Cancelled",
  });
  assert.equal(cancelled.status, "cancelled");
  assert.equal(cancelled.cancellationStatus, "succeeded");
  const unknown = travelLineBookingSnapshot({
    ...booking,
    status: "NewUndocumentedStatus",
  });
  assert.equal(unknown.status, "provider_status_unknown");
});
