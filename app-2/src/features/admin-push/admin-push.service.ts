import { createHash } from "node:crypto";
import type { Logger } from "pino";
import webPush from "web-push";

import type { AdminPushEvent } from "../../generated/prisma/client.js";
import { HttpError } from "../../lib/http/http-error.js";
import type { AdminPushRepository } from "./admin-push.repository.js";
import type { PushSubscriptionBody } from "./admin-push.schemas.js";
import type { AdminPushConfiguration } from "./admin-push.types.js";

const pollIntervalMilliseconds = 15_000;
const eventRetentionMilliseconds = 30 * 24 * 60 * 60 * 1_000;
const eventCleanupIntervalMilliseconds = 60 * 60 * 1_000;

type AdminPushMessage = {
  readonly body: string;
  readonly tag: string;
  readonly title: string;
  readonly url: string;
};
type PushClient = Pick<typeof webPush, "sendNotification">;

export const hashPushEndpoint = (endpoint: string): string =>
  createHash("sha256").update(endpoint).digest("hex");

export const buildAdminPushMessage = (
  event: Pick<AdminPushEvent, "entityId" | "eventKind" | "id" | "type">,
): AdminPushMessage => {
  if (event.type === "lead") {
    return {
      body: "Нажмите, чтобы открыть панель и посмотреть детали.",
      tag: `alsma-${event.id}`,
      title: "Новая заявка с сайта",
      url: "/admin/site-leads",
    };
  }
  if (event.type === "booking") {
    return {
      body: "Нажмите, чтобы открыть панель и посмотреть детали.",
      tag: `alsma-${event.id}`,
      title: "Новая заявка на бронирование",
      url: "/admin/booking-requests",
    };
  }
  if (event.eventKind === "voice_callback_requested") {
    return {
      body: "Нажмите, чтобы открыть карточку звонка и перезвонить гостю.",
      tag: `alsma-${event.id}`,
      title: "Нужен обратный звонок гостю",
      url: `/admin/voice-calls/${encodeURIComponent(event.entityId)}`,
    };
  }
  if (event.eventKind === "manager_requested") {
    return {
      body: "Нажмите, чтобы открыть чат и ответить гостю.",
      tag: `alsma-${event.id}`,
      title: "Гость просит подключить менеджера",
      url: `/admin/requests/${encodeURIComponent(event.entityId)}`,
    };
  }
  return {
    body: "Нажмите, чтобы открыть панель и посмотреть детали.",
    tag: `alsma-${event.id}`,
    title: "Новое обращение",
    url: `/admin/requests/${encodeURIComponent(event.entityId)}`,
  };
};

const statusCodeOf = (error: unknown): number | undefined =>
  error && typeof error === "object" && "statusCode" in error
    ? Number((error as { statusCode?: unknown }).statusCode)
    : undefined;

const canReceiveAdminPush = (user: {
  readonly permissionOverrides: unknown;
  readonly role: { readonly permissions: string[] } | null;
  readonly status: string;
}) => {
  if (user.status !== "active") return false;
  const permissions = new Set(user.role?.permissions ?? []);
  const overrides =
    user.permissionOverrides && typeof user.permissionOverrides === "object"
      ? (user.permissionOverrides as Record<string, unknown>)
      : {};
  Object.entries(overrides).forEach(([permission, enabled]) => {
    if (enabled === true) permissions.add(permission);
    if (enabled === false) permissions.delete(permission);
  });
  return (
    permissions.has("*") ||
    [
      "leads.access",
      "requests.access",
      "dashboard.access",
      "voice.calls.access",
    ].some((permission) => permissions.has(permission))
  );
};

export const createAdminPushService = (
  repository: AdminPushRepository,
  configuration: AdminPushConfiguration,
  logger: Logger,
  pushClient: PushClient = webPush,
) => {
  const enabled = Boolean(configuration.publicKey && configuration.privateKey);
  const endpointInput = (body: PushSubscriptionBody) => ({
    auth: body.keys.auth,
    endpoint: body.endpoint,
    endpointHash: hashPushEndpoint(body.endpoint),
    environment: configuration.environment,
    p256dh: body.keys.p256dh,
  });

  const saveSubscription = async (
    userId: string,
    body: PushSubscriptionBody,
  ) => {
    if (!enabled)
      throw new HttpError(
        503,
        "ADMIN_PUSH_UNAVAILABLE",
        "Push-уведомления пока не настроены.",
      );
    await repository.saveSubscription({
      ...endpointInput(body),
      userId,
    });
  };

  const deleteSubscription = async (userId: string, endpoint: string) =>
    repository.deleteSubscription({
      endpointHash: hashPushEndpoint(endpoint),
      environment: configuration.environment,
      userId,
    });

  const hasSubscription = async (userId: string, endpoint: string) =>
    Boolean(
      await repository.findSubscription({
        endpointHash: hashPushEndpoint(endpoint),
        environment: configuration.environment,
        userId,
      }),
    );

  const sendEvent = async (event: AdminPushEvent): Promise<void> => {
    const subscriptions = (
      await repository.listSubscriptions(configuration.environment)
    ).filter((subscription) => canReceiveAdminPush(subscription.user));
    if (!subscriptions.length) return;

    const message = buildAdminPushMessage(event);
    const payload = JSON.stringify({
      title: message.title,
      body: message.body,
      tag: message.tag,
      url: message.url,
    });
    const results = await Promise.allSettled(
      subscriptions.map(async (subscription) => {
        try {
          await pushClient.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: { auth: subscription.auth, p256dh: subscription.p256dh },
            },
            payload,
            {
              timeout: 15_000,
              TTL: 300,
              urgency: "high",
              vapidDetails: {
                privateKey: configuration.privateKey!,
                publicKey: configuration.publicKey!,
                subject: configuration.subject,
              },
            },
          );
        } catch (error) {
          const statusCode = statusCodeOf(error);
          if (statusCode === 404 || statusCode === 410) {
            await repository.deleteSubscription({
              endpointHash: subscription.endpointHash,
              environment: subscription.environment,
              userId: subscription.userId,
            });
            return;
          }
          throw error;
        }
      }),
    );
    const failures = results.filter((result) => result.status === "rejected");
    if (failures.length) {
      logger.warn(
        { eventId: event.id, failureCount: failures.length },
        "Web push delivery will be retried",
      );
      throw new Error("One or more browser push deliveries failed.");
    }
  };

  const processPendingEvents = async (): Promise<void> => {
    const events = await repository.listPendingEvents(
      configuration.environment,
    );
    for (const event of events) {
      await sendEvent(event);
      await repository.markEventDelivered(event.id, configuration.environment);
    }
  };

  const start = (): (() => void) => {
    if (!enabled) return () => undefined;
    let processing = false;
    let stopped = false;
    let lastCleanupAt = 0;
    const tick = async () => {
      if (processing || stopped) return;
      processing = true;
      try {
        await processPendingEvents();
        if (Date.now() - lastCleanupAt >= eventCleanupIntervalMilliseconds) {
          await repository.deleteExpiredEvents(
            new Date(Date.now() - eventRetentionMilliseconds),
          );
          lastCleanupAt = Date.now();
        }
      } catch (error) {
        logger.warn(
          {
            error: error instanceof Error ? error.message : "Unknown error",
            environment: configuration.environment,
          },
          "Admin browser push processing failed",
        );
      } finally {
        processing = false;
      }
    };
    const timer = setInterval(() => void tick(), pollIntervalMilliseconds);
    void tick();
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  };

  return {
    deleteSubscription,
    enabled,
    hasSubscription,
    processPendingEvents,
    saveSubscription,
    start,
  };
};
