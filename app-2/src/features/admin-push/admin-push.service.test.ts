import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import pino from "pino";

import type { AdminPushEvent } from "../../generated/prisma/client.js";
import type { AdminPushRepository } from "./admin-push.repository.js";
import {
  buildAdminPushMessage,
  createAdminPushService,
  hashPushEndpoint,
} from "./admin-push.service.js";
import type { AdminPushConfiguration } from "./admin-push.types.js";

const event = (type: AdminPushEvent["type"]): AdminPushEvent => ({
  createdAt: new Date(),
  deliveredAtDevelopment: null,
  deliveredAtProduction: null,
  entityId: randomUUID(),
  id: randomUUID(),
  type,
});

const configuration: AdminPushConfiguration = {
  environment: "development",
  privateKey: "private-key-for-test",
  publicKey: "public-key-for-test",
  subject: "https://alsma.ru",
};

test("notification messages link to the matching admin section without guest details", () => {
  const lead = buildAdminPushMessage(event("lead"));
  const request = buildAdminPushMessage(event("request"));
  const booking = buildAdminPushMessage(event("booking"));

  assert.equal(lead.title, "Новая заявка с сайта");
  assert.equal(lead.url, "/admin/site-leads");
  assert.equal(request.title, "Новое обращение");
  assert.match(request.url, /^\/admin\/requests\//u);
  assert.equal(booking.title, "Новая заявка на бронирование");
  assert.equal(booking.url, "/admin/booking-requests");
  for (const message of [lead, request, booking]) {
    assert.doesNotMatch(JSON.stringify(message), /phone|email|guestName/iu);
  }
});

test("endpoint hashes are stable and do not expose the endpoint", () => {
  const endpoint = "https://fcm.googleapis.com/fcm/send/secret-token";
  const digest = hashPushEndpoint(endpoint);
  assert.equal(digest, hashPushEndpoint(endpoint));
  assert.equal(digest.length, 64);
  assert.equal(digest.includes("secret-token"), false);
});

test("delivers queued events and removes expired browser subscriptions", async () => {
  const newEvent = event("lead");
  const subscription = {
    auth: "auth",
    createdAt: new Date(),
    endpoint: "https://fcm.googleapis.com/fcm/send/token",
    endpointHash: "a".repeat(64),
    environment: "development" as const,
    id: randomUUID(),
    p256dh: "p256dh",
    updatedAt: new Date(),
    userId: randomUUID(),
    user: {
      permissionOverrides: {},
      role: { permissions: ["leads.access"] },
      status: "active",
    },
  };
  const delivered: Array<{ eventId: string; environment: string }> = [];
  const removed: string[] = [];
  let sentPayload = "";
  const repository = {
    deleteExpiredEvents: async () => ({ count: 0 }),
    deleteSubscription: async (input: { endpointHash: string }) => {
      removed.push(input.endpointHash);
      return { count: 1 };
    },
    findSubscription: async () => subscription,
    listPendingEvents: async () => [newEvent],
    listSubscriptions: async () => [subscription],
    markEventDelivered: async (eventId: string, environment: string) => {
      delivered.push({ eventId, environment });
      return newEvent;
    },
    saveSubscription: async () => subscription,
  } as unknown as AdminPushRepository;
  const pushClient = {
    sendNotification: async (_subscription: unknown, payload: string) => {
      sentPayload = payload;
      throw Object.assign(new Error("expired"), { statusCode: 410 });
    },
  } as never;
  const service = createAdminPushService(
    repository,
    configuration,
    pino({ level: "silent" }),
    pushClient,
  );

  await service.processPendingEvents();

  assert.deepEqual(delivered, [
    { eventId: newEvent.id, environment: "development" },
  ]);
  assert.deepEqual(removed, [subscription.endpointHash]);
  assert.equal(JSON.parse(sentPayload).title, "Новая заявка с сайта");
  assert.equal(sentPayload.includes(subscription.endpoint), false);
});

test("does not send notifications to inactive administrator accounts", async () => {
  const queuedEvent = event("request");
  const inactiveSubscription = {
    auth: "auth",
    createdAt: new Date(),
    endpoint: "https://fcm.googleapis.com/fcm/send/token",
    endpointHash: "b".repeat(64),
    environment: "development" as const,
    id: randomUUID(),
    p256dh: "p256dh",
    updatedAt: new Date(),
    userId: randomUUID(),
    user: {
      permissionOverrides: {},
      role: { permissions: ["*"] },
      status: "inactive",
    },
  };
  let sendCount = 0;
  const repository = {
    deleteExpiredEvents: async () => ({ count: 0 }),
    deleteSubscription: async () => ({ count: 1 }),
    findSubscription: async () => inactiveSubscription,
    listPendingEvents: async () => [queuedEvent],
    listSubscriptions: async () => [inactiveSubscription],
    markEventDelivered: async () => queuedEvent,
    saveSubscription: async () => inactiveSubscription,
  } as unknown as AdminPushRepository;
  const service = createAdminPushService(
    repository,
    configuration,
    pino({ level: "silent" }),
    {
      sendNotification: async () => {
        sendCount += 1;
      },
    } as never,
  );

  await service.processPendingEvents();

  assert.equal(sendCount, 0);
});
