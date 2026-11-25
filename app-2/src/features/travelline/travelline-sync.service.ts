import { createHash } from "node:crypto";
import type { Logger } from "pino";
import { z } from "zod";

import type { Database } from "../../lib/database/database.js";
import { HttpError } from "../../lib/http/http-error.js";
import {
  type TravelLineService,
  travelLineBookingSnapshot,
} from "./travelline.service.js";

const prefix = "travelline.webhook.v1.";
const bookingNumber = z.string().regex(/^[A-Za-z0-9_-]{1,100}$/u);
export const travelLineEventsSchema = z
  .array(
    z.object({
      eventId: z.string().min(1).max(100),
      eventType: z.string().max(100),
      creationTime: z.string().min(1).max(100),
      payload: z.record(z.string(), z.unknown()),
    }),
  )
  .max(1000);

export const createTravelLineSyncService = (
  database: Database,
  service: TravelLineService,
  logger: Logger,
) => {
  let running = false;
  const syncNumber = async (number: string) => {
    if (!service.client) return;
    const existing = await database.client.guestBooking.findFirst({
      where: {
        provider: "travelline",
        providerPropertyId: service.client.propertyId,
        providerBookingId: number,
      },
    });
    // Events never create/link guests. Only an administrator may establish ownership.
    if (!existing) return;
    await database.client.guestBooking.updateMany({
      where: { id: existing.id },
      data: { providerSyncAttemptedAt: new Date() },
    });
    const snapshot = travelLineBookingSnapshot(
      await service.client.getBooking(number),
    );
    await database.client.guestBooking.updateMany({
      where: {
        id: existing.id,
        provider: "travelline",
        OR: [
          { providerModifiedAt: null },
          { providerModifiedAt: { lte: snapshot.providerModifiedAt } },
        ],
      },
      data: {
        ...snapshot,
        ...(existing.cancellationStatus === "succeeded" &&
        snapshot.status !== "cancelled"
          ? { cancellationStatus: "not_started", cancelledAt: null }
          : {}),
      },
    });
  };
  const syncUserBookings = async (userId: string) => {
    if (!service.enabled || !service.client) return;
    const bookings = await database.client.guestBooking.findMany({
      where: {
        userId,
        provider: "travelline",
        providerPropertyId: service.client.propertyId,
        OR: [
          { providerSyncedAt: null },
          { providerSyncedAt: { lt: new Date(Date.now() - 5 * 60_000) } },
        ],
      },
      orderBy: { providerSyncAttemptedAt: { sort: "asc", nulls: "first" } },
      take: 10,
      select: { providerBookingId: true },
    });
    for (const booking of bookings)
      if (booking.providerBookingId)
        await syncNumber(booking.providerBookingId);
  };
  const processPending = async () => {
    if (running || !service.enabled || !service.client) return;
    running = true;
    try {
      const events = await database.client.appSetting.findMany({
        where: {
          key: { startsWith: prefix },
          value: { path: ["status"], equals: "pending" },
        },
        orderBy: { updatedAt: "asc" },
        take: 10,
      });
      for (const event of events) {
        const value = z.object({ number: bookingNumber }).parse(event.value);
        try {
          await syncNumber(value.number);
          await database.client.appSetting.update({
            where: { key: event.key },
            data: {
              value: {
                status: "processed",
                processedAt: new Date().toISOString(),
              },
            },
          });
        } catch {
          // Move failed items behind the batch; preserve them for the next pass.
          await database.client.appSetting.update({
            where: { key: event.key },
            data: {
              value: { status: "pending", number: value.number },
              updatedAt: new Date(),
            },
          });
          logger.warn(
            { code: "TRAVELLINE_EVENT_RETRY" },
            "TravelLine event deferred",
          );
        }
      }
      const bookings = await database.client.guestBooking.findMany({
        where: {
          provider: "travelline",
          providerPropertyId: service.client.propertyId,
          OR: [
            { providerSyncedAt: null },
            { providerSyncedAt: { lt: new Date(Date.now() - 10 * 60_000) } },
          ],
        },
        orderBy: { providerSyncAttemptedAt: { sort: "asc", nulls: "first" } },
        take: 10,
        select: { providerBookingId: true },
      });
      for (const item of bookings)
        if (item.providerBookingId)
          await syncNumber(item.providerBookingId).catch(() =>
            logger.warn(
              { code: "TRAVELLINE_SYNC_RETRY" },
              "TravelLine refresh deferred",
            ),
          );
      await database.client.appSetting.deleteMany({
        where: {
          key: { startsWith: prefix },
          value: { path: ["status"], equals: "processed" },
          updatedAt: { lt: new Date(Date.now() - 30 * 86_400_000) },
        },
      });
    } finally {
      running = false;
    }
  };
  if (service.enabled) {
    const timer = setInterval(
      () =>
        void processPending().catch(() =>
          logger.warn(
            { code: "TRAVELLINE_SYNC_FAILED" },
            "TravelLine maintenance failed",
          ),
        ),
      60_000,
    );
    timer.unref();
  }
  return {
    syncUserBookings,
    processPending,
    acceptEvents: async (raw: unknown) => {
      const parsed = travelLineEventsSchema.safeParse(raw);
      if (!parsed.success)
        throw new HttpError(
          400,
          "TRAVELLINE_EVENT_INVALID",
          "Неверный формат события.",
        );
      const events = parsed.data;
      const rows = events.flatMap((event) => {
        if (!event.eventType.startsWith("webpms:")) return [];
        if (String(event.payload.PropertyId) !== service.client?.propertyId)
          throw new HttpError(
            400,
            "TRAVELLINE_PROPERTY_MISMATCH",
            "Неверный объект размещения.",
          );
        const parsedNumber = bookingNumber.safeParse(
          event.payload.BookingNumber,
        );
        if (!parsedNumber.success)
          throw new HttpError(
            400,
            "TRAVELLINE_EVENT_INVALID",
            "Неверный номер бронирования.",
          );
        const number = parsedNumber.data;
        return [
          {
            key: `${prefix}${createHash("sha256").update(event.eventId).digest("hex")}`,
            value: { status: "pending", number },
          },
        ];
      });
      // Persist the entire batch before acknowledging. Duplicate IDs cannot reset processed events.
      await database.client.appSetting.createMany({
        data: rows,
        skipDuplicates: true,
      });
      return { accepted: events.length };
    },
    linkBooking: async (userId: string, number: string, adminId: string) => {
      if (!service.client || !service.enabled)
        throw new HttpError(
          503,
          "TRAVELLINE_DISABLED",
          "TravelLine не подключён.",
        );
      const user = await database.client.guestUser.findUnique({
        where: { id: userId },
        select: { id: true },
      });
      if (!user)
        throw new HttpError(404, "GUEST_NOT_FOUND", "Клиент не найден.");
      const snapshot = travelLineBookingSnapshot(
        await service.client.getBooking(bookingNumber.parse(number)),
      );
      return database.client.$transaction(async (tx) => {
        const where = {
          provider_providerPropertyId_providerBookingId: {
            provider: "travelline",
            providerPropertyId: service.client!.propertyId,
            providerBookingId: number,
          },
        };
        const existing = await tx.guestBooking.findUnique({ where });
        if (existing && existing.userId !== userId)
          throw new HttpError(
            409,
            "TRAVELLINE_BOOKING_ALREADY_LINKED",
            "Бронирование уже привязано к другому клиенту.",
          );
        const booking = existing
          ? await tx.guestBooking.update({
              where: { id: existing.id },
              data: snapshot,
            })
          : await tx.guestBooking.create({ data: { ...snapshot, userId } });
        await tx.appSetting.upsert({
          where: { key: `travelline.link.${booking.id}` },
          create: {
            key: `travelline.link.${booking.id}`,
            value: { adminId, userId, at: new Date().toISOString() },
          },
          update: {},
        });
        return { id: booking.id };
      });
    },
    requestCancellation: async (userId: string, id: string, reason?: string) =>
      database.client.$transaction(async (tx) => {
        const booking = await tx.guestBooking.findFirst({
          where: { id, userId, provider: "travelline" },
        });
        if (!booking)
          throw new HttpError(
            404,
            "BOOKING_NOT_FOUND",
            "Бронирование не найдено.",
          );
        if (
          ["requested", "processing", "succeeded"].includes(
            booking.cancellationStatus,
          ) ||
          booking.status === "cancelled"
        )
          return { ok: true };
        const claim = await tx.guestBooking.updateMany({
          where: { id, userId, cancellationStatus: booking.cancellationStatus },
          data: {
            cancellationStatus: "requested",
            cancellationRequestedAt: new Date(),
            cancellationReason: reason ?? null,
          },
        });
        if (claim.count)
          await tx.adminRequest.create({
            data: {
              category: "booking",
              title: `Запрос отмены TravelLine ${booking.providerBookingId}`,
              description:
                reason ??
                "Гость запросил отмену бронирования. Отмените его в TravelLine вручную после проверки условий.",
              details: {
                provider: "travelline",
                bookingId: id,
                userId,
                providerBookingId: booking.providerBookingId,
              },
            },
          });
        return { ok: true };
      }),
  };
};
export type TravelLineSyncService = ReturnType<
  typeof createTravelLineSyncService
>;
