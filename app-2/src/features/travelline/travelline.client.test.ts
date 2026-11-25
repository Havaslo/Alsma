import assert from "node:assert/strict";
import test from "node:test";

import { createTravelLineClient } from "./travelline.client.js";

const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status });
const credentials = {
  clientId: "test-client",
  clientSecret: "do-not-leak-this-secret",
  propertyId: "21062",
};
const criteria = {
  checkIn: "2026-12-01",
  checkOut: "2026-12-03",
  adults: 2,
  childAges: [5, 8],
};
const property = { id: "21062", name: "Алсма", roomTypes: [], ratePlans: [] };
const stay = {
  propertyId: "21062",
  roomType: { id: "1" },
  ratePlan: { id: "2" },
  guestCount: { adultCount: 2, childAges: [5, 8] },
  stayDates: {
    arrivalDateTime: "2026-12-01T14:00",
    departureDateTime: "2026-12-03T12:00",
  },
  availability: 3,
  currencyCode: "RUB",
  total: { priceBeforeTax: 15000, taxAmount: 300 },
  cancellationPolicy: null,
};

test("shares authentication and caches property; renews the token before expiry", async () => {
  let now = 0;
  let auth = 0;
  let reads = 0;
  const client = createTravelLineClient({
    ...credentials,
    now: () => now,
    fetcher: async (url, init) => {
      assert.equal(init?.redirect, "error");
      if (String(url).endsWith("/auth/token")) {
        auth++;
        assert.ok(String(init?.body).includes("grant_type=client_credentials"));
        return json({ access_token: "token", expires_in: 900 });
      }
      reads++;
      return json(property);
    },
  });
  await Promise.all([client.getProperty(), client.getProperty()]);
  assert.equal(auth, 1);
  assert.equal(reads, 1);
  now = 3_600_001;
  await client.getProperty();
  assert.equal(auth, 2);
  assert.equal(reads, 2);
});

test("encodes children as repeated query parameters and preserves taxes separately", async () => {
  const client = createTravelLineClient({
    ...credentials,
    fetcher: async (url) => {
      if (String(url).endsWith("/auth/token"))
        return json({ access_token: "token", expires_in: 900 });
      const parsed = new URL(String(url));
      assert.deepEqual(parsed.searchParams.getAll("childAges"), ["5", "8"]);
      assert.equal(parsed.searchParams.get("arrivalDate"), criteria.checkIn);
      return json({ roomStays: [stay] });
    },
  });
  const result = await client.search(criteria);
  assert.equal(result.roomStays[0]?.total.priceBeforeTax, 15000);
  assert.equal(result.roomStays[0]?.total.taxAmount, 300);
});

test("rejects impossible dates before contacting provider", async () => {
  let called = false;
  const client = createTravelLineClient({
    ...credentials,
    fetcher: async () => {
      called = true;
      return json({});
    },
  });
  await assert.rejects(client.search({ ...criteria, checkIn: "2026-02-30" }));
  await assert.rejects(client.search({ ...criteria, checkOut: "2026-11-30" }));
  assert.equal(called, false);
});

test("re-authenticates once on 401 and never returns provider errors containing secrets", async () => {
  let auth = 0;
  let reads = 0;
  const client = createTravelLineClient({
    ...credentials,
    fetcher: async (url) => {
      if (String(url).endsWith("/auth/token")) {
        auth++;
        return json({ access_token: `token-${auth}`, expires_in: 900 });
      }
      reads++;
      return json(
        { error: credentials.clientSecret, guest: "private guest" },
        401,
      );
    },
  });
  await assert.rejects(client.getProperty(), (error) => {
    assert.ok(error instanceof Error);
    assert.ok(!JSON.stringify(error).includes(credentials.clientSecret));
    assert.ok(!JSON.stringify(error).includes("private guest"));
    return true;
  });
  assert.equal(auth, 2);
  assert.equal(reads, 2);
});

test("does not treat a rights warning or mismatched accommodation as valid availability", async () => {
  let result: unknown = {
    roomStays: [],
    warnings: [{ code: "NotEnoughRights" }],
  };
  const client = createTravelLineClient({
    ...credentials,
    fetcher: async (url) =>
      String(url).endsWith("/auth/token")
        ? json({ access_token: "token", expires_in: 900 })
        : json(result),
  });
  await assert.rejects(client.search(criteria), {
    code: "TRAVELLINE_SEARCH_WARNING",
  });
  result = { roomStays: [{ ...stay, propertyId: "another-hotel" }] };
  await assert.rejects(client.search(criteria), {
    code: "TRAVELLINE_SEARCH_MISMATCH",
  });
  result = { roomStays: [] };
  assert.equal((await client.search(criteria)).roomStays.length, 0);
});

test("keeps reservation pagination parameters exclusive and checks returned property", async () => {
  const client = createTravelLineClient({
    ...credentials,
    fetcher: async (url) => {
      if (String(url).endsWith("/auth/token"))
        return json({ access_token: "token", expires_in: 900 });
      const parsed = new URL(String(url));
      assert.equal(parsed.searchParams.get("continueToken"), "opaque token");
      assert.equal(parsed.searchParams.has("lastModification"), false);
      return json({
        continueToken: "next",
        hasMoreData: false,
        bookingSummaries: [
          {
            number: "123",
            propertyId: 999,
            status: "Active",
            modifiedDateTime: "2026-11-24T00:00:00Z",
          },
        ],
      });
    },
  });
  await assert.rejects(
    client.listBookings({
      continueToken: "opaque token",
      lastModification: "2026-11-24T00:00:00Z",
    }),
  );
  await assert.rejects(client.listBookings({ continueToken: "opaque token" }), {
    code: "TRAVELLINE_PROPERTY_MISMATCH",
  });
});
