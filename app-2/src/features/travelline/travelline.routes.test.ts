import express from "express";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { Database } from "../../lib/database/database.js";
import { errorHandler } from "../../lib/http/error-handler.js";
import type { TravelLineSyncService } from "./travelline-sync.service.js";
import {
  createTravelLineAdminRouter,
  createTravelLineRouter,
} from "./travelline.routes.js";
import { createTravelLineService } from "./travelline.service.js";

test("webhook authentication, guest isolation and module redirect are enforced at the HTTP boundary", async () => {
  let accepted = 0;
  let cancelled = 0;
  const database = {
    client: { guestLoginCode: { findFirst: async () => null } },
  } as unknown as Database;
  const service = createTravelLineService({
    enabled: false,
    webhookSecret: "s".repeat(32),
  });
  const sync = {
    acceptEvents: async () => {
      accepted++;
    },
    requestCancellation: async () => {
      cancelled++;
    },
  } as unknown as TravelLineSyncService;
  const app = express();
  app.use(express.json());
  app.use(createTravelLineRouter(database, service, sync));
  app.use(errorHandler);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    const response = await fetch(`${base}/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "API-KEY": "wrong" },
      body: "[]",
    });
    assert.equal(response.status, 401);
    const cancellation = await fetch(`${base}/cancellation-requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookingId: "00000000-0000-4000-8000-000000000001",
      }),
    });
    assert.equal(cancellation.status, 401);
    assert.equal(accepted, 0);
    assert.equal(cancelled, 0);
    const checkout = await fetch(
      `${base}/checkout?checkIn=2026-12-01&checkOut=2026-12-03&adults=2`,
      { redirect: "manual" },
    );
    assert.equal(checkout.status, 503);
    const config = await (await fetch(`${base}/config`)).json();
    assert.deepEqual(config, {
      enabled: false,
      checkoutReady: false,
      provider: "travelline",
    });
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test("enabled HTTP routes enforce webhook keys, admin roles, ownership confirmation and validated checkout", async () => {
  let accepted = 0;
  let linked = 0;
  let permission = "dashboard.access";
  const database = {
    client: {
      adminSession: {
        findFirst: async ({ where }: { where: { tokenHash: string } }) =>
          where.tokenHash ===
          "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
            ? null
            : {
                user: {
                  id: "admin",
                  displayName: "Admin",
                  email: "admin@example.test",
                  permissionOverrides: {},
                  role: { name: "test", permissions: [permission] },
                },
              },
      },
    },
  } as unknown as Database;
  const service = createTravelLineService({
    enabled: true,
    clientId: "test",
    clientSecret: "test",
    propertyId: "21062",
    bookingUrl: "https://booking.example/reserve",
    webhookSecret: "s".repeat(32),
  });
  const sync = {
    acceptEvents: async () => {
      accepted++;
    },
    linkBooking: async () => {
      linked++;
      return { id: "booking" };
    },
  } as unknown as TravelLineSyncService;
  const app = express();
  app.use(express.json());
  app.use("/admin", createTravelLineAdminRouter(database, service, sync));
  app.use(createTravelLineRouter(database, service, sync));
  app.use(errorHandler);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const body = {
    userId: "00000000-0000-4000-8000-000000000001",
    bookingNumber: "booking-1",
    ownershipConfirmed: true,
  };
  const post = (
    path: string,
    value: unknown,
    headers: Record<string, string> = {},
  ) =>
    fetch(`${base}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(value),
    });
  try {
    assert.equal(
      (await post("/webhook", [], { "API-KEY": "bad" })).status,
      401,
    );
    assert.equal(
      (await post("/webhook", [], { "API-KEY": "s".repeat(32) })).status,
      204,
    );
    assert.equal(accepted, 1);
    assert.equal((await post("/admin/link-booking", body)).status, 401);
    permission = "integrations.access";
    assert.equal(
      (
        await post("/admin/link-booking", body, {
          Authorization: "Bearer test",
        })
      ).status,
      403,
    );
    permission = "dashboard.access";
    assert.equal(
      (
        await post(
          "/admin/link-booking",
          { ...body, ownershipConfirmed: false },
          { Authorization: "Bearer test" },
        )
      ).status,
      400,
    );
    assert.equal(linked, 0);
    assert.equal(
      (
        await post("/admin/link-booking", body, {
          Authorization: "Bearer test",
        })
      ).status,
      200,
    );
    assert.equal(linked, 1);
    const response = await fetch(
      `${base}/checkout?checkIn=2026-12-01&checkOut=2026-12-03&adults=2&childAges=5,8`,
      { redirect: "manual" },
    );
    assert.equal(response.status, 302);
    const target = new URL(response.headers.get("location")!);
    assert.equal(target.hostname, "booking.example");
    assert.equal(target.searchParams.get("children-age"), "5,8");
    assert.equal(
      (await fetch(`${base}/checkout?checkIn=2026-12-03&checkOut=2026-12-01`))
        .status,
      400,
    );
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
