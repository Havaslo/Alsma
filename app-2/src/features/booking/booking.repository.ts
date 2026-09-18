import type { Prisma } from "../../generated/prisma/client.js";
import type { Database } from "../../lib/database/database.js";

export const createBookingRepository = (database: Database) => ({
  createGuestBooking: (input: {
    checkInDate: Date;
    checkOutDate: Date;
    contactComment: string | null;
    contactEmail: string;
    contactFirstName: string | null;
    contactLastName: string | null;
    contactPhone: string;
    currency: string;
    paymentDeadlineAt: Date;
    epteraReservationId: string | null;
    guestsCount: number;
    guestList: Prisma.InputJsonValue;
    roomName: string;
    selectedOffer: Prisma.InputJsonValue;
    paymentMethod: "full" | "first_night";
    totalAmount: number;
    userId: string;
    voucherNumber: string | null;
  }) =>
    database.client.guestBooking.create({
      data: {
        ...input,
        paymentStatus: "payment_pending",
        paymentDeadlineAt: input.paymentDeadlineAt,
        paymentMethod: input.paymentMethod,
        status: "awaiting_payment",
      },
    }),
  updatePayment: (input: {
    bookingId: string;
    paymentAmount: number;
    paymentId: string;
    paymentStatus: string;
    status: string;
  }) =>
    database.client.guestBooking.update({
      data: {
        paymentAmount: input.paymentAmount,
        paymentId: input.paymentId,
        paymentStatus: input.paymentStatus,
        status: input.status,
      },
      where: { id: input.bookingId },
    }),
  markYooKassaPaymentSucceeded: (input: {
    bookingId: string;
    paymentAmount: number;
    paymentId: string;
  }) =>
    database.client.guestBooking
      .updateMany({
        data: {
          cancellationErrorCode: null,
          cancellationErrorMessage: null,
          cancellationStatus: "skipped",
          paymentAmount: input.paymentAmount,
          paymentId: input.paymentId,
          paymentStatus: "succeeded",
          status: "payment_sync_pending",
        },
        where: {
          cancellationStatus: { not: "succeeded" },
          id: input.bookingId,
          paymentStatus: { not: "succeeded" },
        },
      })
      .then(() =>
        database.client.guestBooking.findUnique({
          where: { id: input.bookingId },
        }),
      ),
  findExpiredUnpaidBookings: (input: { now: Date; limit: number }) =>
    database.client.guestBooking.findMany({
      where: {
        cancellationStatus: { in: ["not_started", "failed"] },
        paymentDeadlineAt: { lte: input.now },
        paymentStatus: { not: "succeeded" },
        status: { in: ["awaiting_payment", "cancellation_failed"] },
      },
      orderBy: { paymentDeadlineAt: "asc" },
      select: {
        epteraReservationId: true,
        id: true,
        paymentId: true,
        voucherNumber: true,
      },
      take: input.limit,
    }),
  claimBookingCancellation: (input: {
    bookingId: string;
    attemptedAt: Date;
    now: Date;
  }) =>
    database.client.guestBooking
      .updateMany({
        data: {
          cancellationAttemptedAt: input.attemptedAt,
          cancellationErrorCode: null,
          cancellationErrorMessage: null,
          cancellationStatus: "processing",
          status: "cancellation_pending",
        },
        where: {
          cancellationStatus: { in: ["not_started", "failed"] },
          id: input.bookingId,
          paymentDeadlineAt: { lte: input.now },
          paymentStatus: { not: "succeeded" },
          status: { in: ["awaiting_payment", "cancellation_failed"] },
        },
      })
      .then((result) => result.count > 0),
  markBookingCancelled: (input: {
    bookingId: string;
    attemptedAt: Date;
    cancelledAt: Date;
  }) =>
    database.client.guestBooking.updateMany({
      data: {
        cancelledAt: input.cancelledAt,
        cancellationErrorCode: null,
        cancellationErrorMessage: null,
        cancellationStatus: "succeeded",
        status: "cancelled",
      },
      where: {
        cancellationAttemptedAt: input.attemptedAt,
        cancellationStatus: "processing",
        id: input.bookingId,
        paymentStatus: { not: "succeeded" },
      },
    }),
  markBookingCancellationFailed: (input: {
    bookingId: string;
    attemptedAt: Date;
    errorCode: string;
    errorMessage: string;
  }) =>
    database.client.guestBooking.updateMany({
      data: {
        cancellationErrorCode: input.errorCode,
        cancellationErrorMessage: input.errorMessage,
        cancellationStatus: "failed",
        status: "cancellation_failed",
      },
      where: {
        cancellationAttemptedAt: input.attemptedAt,
        cancellationStatus: "processing",
        id: input.bookingId,
        paymentStatus: { not: "succeeded" },
      },
    }),
  claimEpteraPaymentSync: (input: {
    bookingId: string;
    attemptedAt: Date;
    staleBefore: Date;
  }) =>
    database.client.guestBooking
      .updateMany({
        data: {
          epteraPaymentSyncAttemptedAt: input.attemptedAt,
          epteraPaymentSyncStatus: "processing",
          status: "payment_sync_pending",
        },
        where: {
          id: input.bookingId,
          paymentStatus: "succeeded",
          OR: [
            { epteraPaymentSyncStatus: { in: ["pending", "failed"] } },
            {
              epteraPaymentSyncAttemptedAt: { lt: input.staleBefore },
              epteraPaymentSyncStatus: "processing",
            },
          ],
        },
      })
      .then((result) => result.count > 0),
  markEpteraPaymentSyncSucceeded: (input: {
    bookingId: string;
    attemptedAt: Date;
    syncedAt: Date;
  }) =>
    database.client.guestBooking.updateMany({
      data: {
        epteraPaymentSyncedAt: input.syncedAt,
        epteraPaymentSyncStatus: "succeeded",
        status: "confirmed",
      },
      where: {
        epteraPaymentSyncAttemptedAt: input.attemptedAt,
        epteraPaymentSyncStatus: "processing",
        id: input.bookingId,
        paymentStatus: "succeeded",
      },
    }),
  markEpteraPaymentSyncFailed: (input: {
    bookingId: string;
    attemptedAt: Date;
  }) =>
    database.client.guestBooking.updateMany({
      data: {
        epteraPaymentSyncedAt: null,
        epteraPaymentSyncStatus: "failed",
        status: "payment_sync_failed",
      },
      where: {
        epteraPaymentSyncAttemptedAt: input.attemptedAt,
        epteraPaymentSyncStatus: "processing",
        id: input.bookingId,
        paymentStatus: "succeeded",
      },
    }),
  findBookingByPaymentId: (paymentId: string) =>
    database.client.guestBooking.findUnique({ where: { paymentId } }),
  findBooking: (bookingId: string) =>
    database.client.guestBooking.findUnique({ where: { id: bookingId } }),
  findOrCreateGuest: (input: {
    email: string;
    fullName: string;
    phone: string;
  }) =>
    database.client.$transaction(async (transaction) => {
      const byEmail = await transaction.guestUser.findFirst({
        where: { email: input.email },
      });
      if (byEmail) {
        const phoneOwner = await transaction.guestUser.findUnique({
          where: { phone: input.phone },
        });
        return transaction.guestUser.update({
          data: {
            fullName: input.fullName,
            ...(phoneOwner && phoneOwner.id !== byEmail.id
              ? {}
              : { phone: input.phone }),
          },
          where: { id: byEmail.id },
        });
      }
      const byPhone = await transaction.guestUser.findUnique({
        where: { phone: input.phone },
      });
      if (byPhone && (!byPhone.email || byPhone.email === input.email)) {
        return transaction.guestUser.update({
          data: { email: input.email, fullName: input.fullName },
          where: { id: byPhone.id },
        });
      }
      return transaction.guestUser.create({
        data: {
          email: input.email,
          fullName: input.fullName,
          phone: `email:${input.email}`,
        },
      });
    }),
});

export type BookingRepository = ReturnType<typeof createBookingRepository>;
