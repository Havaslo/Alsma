import type { Logger } from "pino";

import { Prisma } from "../../generated/prisma/client.js";
import type { Database } from "../../lib/database/database.js";
import type {
  EpteraClient,
  EpteraReservationSnapshot,
} from "./eptera.client.js";

const SYNC_INTERVAL_MS = 10 * 60_000;
const FRESHNESS_WINDOW_MS = 5 * 60_000;
const STALE_ATTEMPT_WINDOW_MS = 60_000;

const providerDate = (value: string | null): Date | undefined => {
  if (!value) return undefined;
  const parsed = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00.000Z` : value,
  );
  return Number.isFinite(parsed.getTime()) ? parsed : undefined;
};

const providerText = (value: string | null): string | undefined =>
  value?.trim() || undefined;

const providerError = (error: unknown): string =>
  error instanceof Error
    ? error.message.slice(0, 500)
    : "Неизвестная ошибка синхронизации.";

const snapshotJson = (snapshot: EpteraReservationSnapshot) =>
  JSON.parse(JSON.stringify(snapshot.raw)) as Prisma.InputJsonValue;

export const createGuestBookingSyncService = (
  database: Database,
  eptera: Pick<EpteraClient, "getReservation">,
  logger: Logger,
) => {
  let running = false;

  const syncBooking = async (
    bookingId: string,
  ): Promise<"succeeded" | "not_found" | "failed" | "skipped"> => {
    const booking = await database.client.guestBooking.findUnique({
      select: {
        epteraLastSyncedAt: true,
        epteraReservationId: true,
        epteraSyncStatus: true,
        id: true,
      },
      where: { id: bookingId },
    });
    if (!booking?.epteraReservationId) return "skipped";
    if (
      booking.epteraLastSyncedAt &&
      Date.now() - booking.epteraLastSyncedAt.getTime() < FRESHNESS_WINDOW_MS
    )
      return "skipped";

    const attemptedAt = new Date();
    const claimed = await database.client.guestBooking.updateMany({
      data: {
        epteraSyncAttemptedAt: attemptedAt,
        epteraSyncError: null,
        epteraSyncStatus: "processing",
      },
      where: {
        id: booking.id,
        OR: [
          { epteraSyncStatus: { not: "processing" } },
          {
            epteraSyncAttemptedAt: {
              lt: new Date(attemptedAt.getTime() - STALE_ATTEMPT_WINDOW_MS),
            },
            epteraSyncStatus: "processing",
          },
        ],
      },
    });
    if (claimed.count !== 1) return "skipped";

    try {
      const snapshot = await eptera.getReservation(booking.epteraReservationId);
      if (!snapshot) {
        await database.client.guestBooking.updateMany({
          data: {
            epteraLastSyncedAt: new Date(),
            epteraSnapshot: Prisma.DbNull,
            epteraStatus: null,
            epteraSyncError: null,
            epteraSyncStatus: "not_found",
          },
          where: { epteraSyncAttemptedAt: attemptedAt, id: booking.id },
        });
        return "not_found";
      }

      const checkInDate = providerDate(snapshot.checkIn);
      const checkOutDate = providerDate(snapshot.checkOut);
      await database.client.guestBooking.updateMany({
        data: {
          ...(checkInDate ? { checkInDate } : {}),
          ...(checkOutDate ? { checkOutDate } : {}),
          ...(snapshot.roomNumber
            ? { epteraRoomNumber: providerText(snapshot.roomNumber) }
            : {}),
          ...(snapshot.roomTypeName || snapshot.roomType
            ? { roomName: snapshot.roomTypeName ?? snapshot.roomType! }
            : {}),
          ...(snapshot.totalPrice !== null && snapshot.totalPrice >= 0
            ? { totalAmount: snapshot.totalPrice }
            : {}),
          ...(snapshot.voucherNumber
            ? { voucherNumber: providerText(snapshot.voucherNumber) }
            : {}),
          epteraLastSyncedAt: new Date(),
          epteraSnapshot: snapshotJson(snapshot),
          epteraStatus: providerText(snapshot.state),
          epteraSyncError: null,
          epteraSyncStatus: "succeeded",
        },
        where: { epteraSyncAttemptedAt: attemptedAt, id: booking.id },
      });
      return "succeeded";
    } catch (error) {
      await database.client.guestBooking.updateMany({
        data: {
          epteraSyncError: providerError(error),
          epteraSyncStatus: "failed",
        },
        where: { epteraSyncAttemptedAt: attemptedAt, id: booking.id },
      });
      return "failed";
    }
  };

  const syncUserBookings = async (userId: string): Promise<void> => {
    const bookings = await database.client.guestBooking.findMany({
      select: { id: true },
      where: { epteraReservationId: { not: null }, userId },
      orderBy: { checkInDate: "desc" },
    });
    for (const booking of bookings) await syncBooking(booking.id);
  };

  const syncAll = async (): Promise<void> => {
    if (running) return;
    running = true;
    try {
      const bookings = await database.client.guestBooking.findMany({
        select: { id: true },
        where: { epteraReservationId: { not: null } },
        orderBy: { checkInDate: "asc" },
        take: 100,
      });
      const counts = { failed: 0, notFound: 0, succeeded: 0 };
      for (const booking of bookings) {
        const result = await syncBooking(booking.id);
        if (result === "failed") counts.failed += 1;
        if (result === "not_found") counts.notFound += 1;
        if (result === "succeeded") counts.succeeded += 1;
      }
      if (counts.failed || counts.notFound || counts.succeeded)
        logger.info(counts, "Eptera reservation synchronization completed");
    } catch (error) {
      logger.warn(
        { error: providerError(error) },
        "Eptera reservation synchronization failed",
      );
    } finally {
      running = false;
    }
  };

  const timer = setInterval(() => void syncAll(), SYNC_INTERVAL_MS);
  timer.unref();
  void syncAll();

  return { syncAll, syncUserBookings };
};

export type GuestBookingSyncService = ReturnType<
  typeof createGuestBookingSyncService
>;
