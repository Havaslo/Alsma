import type { Database } from "../../lib/database/database.js";
import type { AdminPushEnvironment } from "./admin-push.types.js";

export const createAdminPushRepository = (database: Database) => ({
  deleteExpiredEvents: (cutoff: Date) =>
    database.client.adminPushEvent.deleteMany({
      where: { createdAt: { lt: cutoff } },
    }),
  deleteSubscription: (input: {
    endpointHash: string;
    environment: AdminPushEnvironment;
    userId: string;
  }) => database.client.adminPushSubscription.deleteMany({ where: input }),
  findSubscription: (input: {
    endpointHash: string;
    environment: AdminPushEnvironment;
    userId: string;
  }) => database.client.adminPushSubscription.findFirst({ where: input }),
  listPendingEvents: (environment: AdminPushEnvironment) =>
    database.client.adminPushEvent.findMany({
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: 50,
      where: {
        ...(environment === "development"
          ? { deliveredAtDevelopment: null }
          : { deliveredAtProduction: null }),
      },
    }),
  markEventDelivered: (eventId: string, environment: AdminPushEnvironment) =>
    database.client.adminPushEvent.update({
      data:
        environment === "development"
          ? { deliveredAtDevelopment: new Date() }
          : { deliveredAtProduction: new Date() },
      where: { id: eventId },
    }),
  listSubscriptions: (environment: AdminPushEnvironment) =>
    database.client.adminPushSubscription.findMany({
      include: { user: { include: { role: true } } },
      where: { environment },
    }),
  saveSubscription: (input: {
    auth: string;
    endpoint: string;
    endpointHash: string;
    environment: AdminPushEnvironment;
    p256dh: string;
    userId: string;
  }) => {
    const { auth, endpoint, endpointHash, environment, p256dh, userId } = input;
    return database.client.adminPushSubscription.upsert({
      create: {
        auth,
        endpoint,
        endpointHash,
        environment,
        p256dh,
        userId,
      },
      update: { auth, endpoint, p256dh, userId },
      where: { environment_endpointHash: { endpointHash, environment } },
    });
  },
});

export type AdminPushRepository = ReturnType<typeof createAdminPushRepository>;
