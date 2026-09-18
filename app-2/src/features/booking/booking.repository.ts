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
    epteraReservationPayload: Prisma.InputJsonValue;
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
  markPaymentCreationFailed: (input: { bookingId: string }) =>
    database.client.guestBooking.update({
      data: {
        paymentStatus: "creation_failed",
        status: "payment_creation_failed",
      },
      where: { id: input.bookingId },
    }),
  markYooKassaPaymentSucceeded: (input: {
    bookingId: string;
    paymentAmount: number;
    paymentId: string;
  }) =>
    database.client.guestBooking.update({
      data: {
        paymentAmount: input.paymentAmount,
        paymentId: input.paymentId,
        paymentStatus: "succeeded",
        status: "eptera_reservation_pending",
      },
      where: { id: input.bookingId },
    }),
  claimEpteraReservationCreation: (input: {
    bookingId: string;
    attemptedAt: Date;
  }) =>
    database.client.guestBooking
      .updateMany({
        data: {
          epteraReservationSyncAttemptedAt: input.attemptedAt,
          epteraReservationSyncStatus: "processing",
          status: "eptera_reservation_pending",
        },
        where: {
          epteraReservationId: null,
          epteraReservationSyncStatus: "pending",
          id: input.bookingId,
          paymentStatus: "succeeded",
        },
      })
      .then((result) => result.count > 0),
  markEpteraReservationCreated: (input: {
    bookingId: string;
    attemptedAt: Date;
    reservationId: string;
    syncedAt: Date;
    voucherNumber: string | null;
  }) =>
    database.client.guestBooking.updateMany({
      data: {
        epteraReservationId: input.reservationId,
        epteraReservationSyncErrorCode: null,
        epteraReservationSyncErrorMessage: null,
        epteraReservationSyncStatus: "succeeded",
        epteraReservationSyncedAt: input.syncedAt,
        status: "eptera_payment_pending",
        voucherNumber: input.voucherNumber,
      },
      where: {
        epteraReservationId: null,
        epteraReservationSyncAttemptedAt: input.attemptedAt,
        epteraReservationSyncStatus: "processing",
        id: input.bookingId,
        paymentStatus: "succeeded",
      },
    }),
  markEpteraReservationSyncFailed: (input: {
    bookingId: string;
    attemptedAt: Date;
    errorCode: string;
    errorMessage: string;
  }) =>
    database.client.guestBooking.updateMany({
      data: {
        epteraReservationSyncErrorCode: input.errorCode,
        epteraReservationSyncErrorMessage: input.errorMessage,
        epteraReservationSyncStatus: "failed",
        status: "eptera_reservation_failed",
      },
      where: {
        epteraReservationSyncAttemptedAt: input.attemptedAt,
        epteraReservationSyncStatus: "processing",
        id: input.bookingId,
        paymentStatus: "succeeded",
      },
    }),
  claimEpteraPaymentSync: (input: { bookingId: string; attemptedAt: Date }) =>
    database.client.guestBooking
      .updateMany({
        data: {
          epteraPaymentSyncAttemptedAt: input.attemptedAt,
          epteraPaymentSyncStatus: "processing",
          epteraPaymentSyncErrorCode: null,
          epteraPaymentSyncErrorMessage: null,
          status: "payment_sync_pending",
        },
        where: {
          id: input.bookingId,
          paymentStatus: "succeeded",
          epteraPaymentSyncStatus: "pending",
          epteraReservationId: { not: null },
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
        epteraPaymentSyncErrorCode: null,
        epteraPaymentSyncErrorMessage: null,
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
    errorCode: string;
    errorMessage: string;
  }) =>
    database.client.guestBooking.updateMany({
      data: {
        epteraPaymentSyncErrorCode: input.errorCode,
        epteraPaymentSyncErrorMessage: input.errorMessage,
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
