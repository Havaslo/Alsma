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
  markBookingsCancelledAfterPartialFailure: (input: {
    attemptedAt: Date;
    bookings: Array<{
      bookingId: string;
      cancellationSucceeded: boolean;
      errorCode?: string;
      errorMessage?: string;
    }>;
  }) =>
    database.client.$transaction(async (transaction) => {
      let count = 0;
      for (const booking of input.bookings) {
        const result = await transaction.guestBooking.updateMany({
          data: booking.cancellationSucceeded
            ? {
                cancelledAt: new Date(),
                cancellationAttemptedAt: input.attemptedAt,
                cancellationErrorCode: null,
                cancellationErrorMessage: null,
                cancellationStatus: "succeeded",
                status: "cancelled",
              }
            : {
                cancellationAttemptedAt: input.attemptedAt,
                cancellationErrorCode:
                  booking.errorCode ?? "EPTERA_CANCELLATION_FAILED",
                cancellationErrorMessage:
                  booking.errorMessage ??
                  "Не удалось автоматически отменить бронь.",
                cancellationStatus: "failed",
                status: "cancellation_failed",
              },
          where: {
            cancellationStatus: { not: "succeeded" },
            id: booking.bookingId,
            paymentStatus: { not: "succeeded" },
          },
        });
        count += result.count;
      }
      return { count };
    }),
  createGuestBookingGroup: (input: {
    checkInDate: Date;
    checkOutDate: Date;
    contactComment: string | null;
    contactEmail: string;
    contactFirstName: string;
    contactLastName: string;
    contactPhone: string;
    currency: string;
    roomsCount: number;
    totalAmount: number;
    userId: string;
  }) =>
    database.client.guestBookingGroup.create({
      data: {
        ...input,
        paymentStatus: "payment_pending",
        status: "creating_reservations",
      },
    }),
  markGroupReservationCreationFailed: (input: {
    groupId: string;
    errorCode: string;
    errorMessage: string;
    reservationIds: Prisma.InputJsonValue;
    cancellationErrorCode?: string;
    cancellationErrorMessage?: string;
  }) =>
    database.client.guestBookingGroup.update({
      data: {
        ...(input.cancellationErrorCode
          ? {
              cancellationErrorCode: input.cancellationErrorCode,
              cancellationErrorMessage: input.cancellationErrorMessage,
              cancellationStatus: "failed",
            }
          : {}),
        reservationCreationErrorCode: input.errorCode,
        reservationCreationErrorMessage: input.errorMessage,
        reservationCreationStatus: "failed",
        reservationIds: input.reservationIds,
        status: input.cancellationErrorCode
          ? "cancellation_failed"
          : "reservation_creation_failed",
      },
      where: { id: input.groupId },
    }),
  createGroupBookings: (input: {
    deadline: Date;
    groupId: string;
    bookings: Array<{
      checkInDate: Date;
      checkOutDate: Date;
      contactComment: string | null;
      contactEmail: string;
      contactFirstName: string;
      contactLastName: string;
      contactPhone: string;
      currency: string;
      epteraReservationId: string;
      guestsCount: number;
      guestList: Prisma.InputJsonValue;
      roomName: string;
      selectedOffer: Prisma.InputJsonValue;
      totalAmount: number;
      voucherNumber: string | null;
    }>;
    reservationIds: Prisma.InputJsonValue;
    totalAmount: number;
  }) =>
    database.client.$transaction(async (transaction) => {
      const group = await transaction.guestBookingGroup.update({
        data: {
          paymentDeadlineAt: input.deadline,
          reservationCreationStatus: "succeeded",
          reservationIds: input.reservationIds,
          status: "awaiting_payment",
          totalAmount: input.totalAmount,
        },
        where: { id: input.groupId },
      });
      await Promise.all(
        input.bookings.map((booking) =>
          transaction.guestBooking.create({
            data: {
              ...booking,
              groupId: input.groupId,
              paymentDeadlineAt: input.deadline,
              paymentMethod: group.paymentMethod,
              paymentStatus: "payment_pending",
              status: "awaiting_payment",
              userId: group.userId,
            },
          }),
        ),
      );
      return group;
    }),
  updateGroupPayment: (input: {
    groupId: string;
    paymentAmount: number;
    paymentId: string;
    paymentStatus: string;
    status: string;
  }) =>
    database.client.$transaction(async (transaction) => {
      const group = await transaction.guestBookingGroup.update({
        data: {
          paymentAmount: input.paymentAmount,
          paymentId: input.paymentId,
          paymentStatus: input.paymentStatus,
          status: input.status,
        },
        where: { id: input.groupId },
      });
      await transaction.guestBooking.updateMany({
        data: { status: input.status, paymentStatus: input.paymentStatus },
        where: { groupId: input.groupId },
      });
      return group;
    }),
  markGroupPaymentCreationFailed: (input: {
    groupId: string;
    errorCode: string;
    errorMessage: string;
    cancellationErrorCode?: string;
    cancellationErrorMessage?: string;
  }) =>
    database.client.$transaction(async (transaction) => {
      const group = await transaction.guestBookingGroup.update({
        data: {
          ...(input.cancellationErrorCode
            ? {
                cancellationErrorCode: input.cancellationErrorCode,
                cancellationErrorMessage: input.cancellationErrorMessage,
                cancellationStatus: "failed",
              }
            : {}),
          reservationCreationErrorCode: input.errorCode,
          reservationCreationErrorMessage: input.errorMessage,
          paymentStatus: "creation_failed",
          status: input.cancellationErrorCode
            ? "cancellation_failed"
            : "payment_creation_failed",
        },
        where: { id: input.groupId },
      });
      await transaction.guestBooking.updateMany({
        data: {
          paymentStatus: "creation_failed",
          ...(input.cancellationErrorCode
            ? {
                cancellationErrorCode: input.cancellationErrorCode,
                cancellationErrorMessage: input.cancellationErrorMessage,
                cancellationStatus: "failed",
              }
            : {}),
          status: input.cancellationErrorCode
            ? "cancellation_failed"
            : "payment_creation_failed",
        },
        where: { groupId: input.groupId },
      });
      return group;
    }),
  findGroup: (groupId: string) =>
    database.client.guestBookingGroup.findUnique({
      include: { bookings: { orderBy: { createdAt: "asc" } } },
      where: { id: groupId },
    }),
  findGroupByPaymentId: (paymentId: string) =>
    database.client.guestBookingGroup.findUnique({
      include: { bookings: { orderBy: { createdAt: "asc" } } },
      where: { paymentId },
    }),
  markGroupPaymentSucceeded: (input: {
    groupId: string;
    paymentAmount: number;
    paymentId: string;
    bookings: Array<{ id: string; paymentAmount: number }>;
  }) =>
    database.client.$transaction(async (transaction) => {
      const claimed = await transaction.guestBookingGroup.updateMany({
        data: {
          paymentAmount: input.paymentAmount,
          paymentId: input.paymentId,
          paymentStatus: "succeeded",
          status: "payment_sync_pending",
        },
        where: {
          cancellationStatus: { not: "processing" },
          id: input.groupId,
          paymentStatus: { not: "succeeded" },
        },
      });
      if (claimed.count === 1) {
        for (const booking of input.bookings)
          await transaction.guestBooking.updateMany({
            data: {
              paymentAmount: booking.paymentAmount,
              paymentStatus: "succeeded",
              status: "payment_sync_pending",
            },
            where: { groupId: input.groupId, id: booking.id },
          });
      }
      return transaction.guestBookingGroup.findUnique({
        include: { bookings: { orderBy: { createdAt: "asc" } } },
        where: { id: input.groupId },
      });
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
        groupId: null,
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
  findExpiredUnpaidGroups: (input: { now: Date; limit: number }) =>
    database.client.guestBookingGroup.findMany({
      where: {
        cancellationStatus: { in: ["not_started", "failed"] },
        paymentStatus: { not: "succeeded" },
        status: { in: ["awaiting_payment", "cancellation_failed"] },
        OR: [
          { paymentDeadlineAt: { lte: input.now } },
          { status: "cancellation_failed" },
        ],
      },
      orderBy: { paymentDeadlineAt: "asc" },
      select: { id: true, paymentId: true },
      take: input.limit,
    }),
  claimGroupCancellation: (input: {
    groupId: string;
    attemptedAt: Date;
    now: Date;
  }) =>
    database.client.$transaction(async (transaction) => {
      const claimed = await transaction.guestBookingGroup.updateMany({
        data: {
          cancellationAttemptedAt: input.attemptedAt,
          cancellationErrorCode: null,
          cancellationErrorMessage: null,
          cancellationStatus: "processing",
          status: "cancellation_pending",
        },
        where: {
          cancellationStatus: { in: ["not_started", "failed"] },
          id: input.groupId,
          paymentStatus: { not: "succeeded" },
          status: { in: ["awaiting_payment", "cancellation_failed"] },
          OR: [
            { paymentDeadlineAt: { lte: input.now } },
            { status: "cancellation_failed" },
          ],
        },
      });
      if (claimed.count === 1)
        await transaction.guestBooking.updateMany({
          data: {
            cancellationAttemptedAt: input.attemptedAt,
            cancellationErrorCode: null,
            cancellationErrorMessage: null,
            cancellationStatus: "processing",
            status: "cancellation_pending",
          },
          where: {
            groupId: input.groupId,
            paymentStatus: { not: "succeeded" },
          },
        });
      return claimed.count > 0;
    }),
  markGroupCancellationFailed: (input: {
    groupId: string;
    attemptedAt: Date;
    errorCode: string;
    errorMessage: string;
  }) =>
    database.client.$transaction(async (transaction) => {
      const group = await transaction.guestBookingGroup.updateMany({
        data: {
          cancellationErrorCode: input.errorCode,
          cancellationErrorMessage: input.errorMessage,
          cancellationStatus: "failed",
          status: "cancellation_failed",
        },
        where: {
          cancellationAttemptedAt: input.attemptedAt,
          cancellationStatus: "processing",
          id: input.groupId,
        },
      });
      await transaction.guestBooking.updateMany({
        data: {
          cancellationErrorCode: input.errorCode,
          cancellationErrorMessage: input.errorMessage,
          cancellationStatus: "failed",
          status: "cancellation_failed",
        },
        where: {
          cancellationAttemptedAt: input.attemptedAt,
          cancellationStatus: "processing",
          groupId: input.groupId,
          paymentStatus: { not: "succeeded" },
        },
      });
      return group;
    }),
  markGroupCancelled: (input: {
    groupId: string;
    attemptedAt: Date;
    cancelledAt: Date;
  }) =>
    database.client.$transaction(async (transaction) => {
      const group = await transaction.guestBookingGroup.updateMany({
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
          id: input.groupId,
          paymentStatus: { not: "succeeded" },
        },
      });
      await transaction.guestBooking.updateMany({
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
          groupId: input.groupId,
          paymentStatus: { not: "succeeded" },
        },
      });
      return group;
    }),
  releaseGroupCancellationForPayment: (input: {
    groupId: string;
    attemptedAt: Date;
  }) =>
    database.client.$transaction(async (transaction) => {
      const group = await transaction.guestBookingGroup.updateMany({
        data: {
          cancellationErrorCode: null,
          cancellationErrorMessage: null,
          cancellationStatus: "skipped",
          status: "awaiting_payment",
        },
        where: {
          cancellationAttemptedAt: input.attemptedAt,
          cancellationStatus: "processing",
          id: input.groupId,
          paymentStatus: { not: "succeeded" },
        },
      });
      await transaction.guestBooking.updateMany({
        data: {
          cancellationErrorCode: null,
          cancellationErrorMessage: null,
          cancellationStatus: "skipped",
          status: "awaiting_payment",
        },
        where: {
          cancellationAttemptedAt: input.attemptedAt,
          cancellationStatus: "processing",
          groupId: input.groupId,
          paymentStatus: { not: "succeeded" },
        },
      });
      return group.count > 0;
    }),
  markGroupConfirmedIfAllSynced: async (groupId: string) => {
    const group = await database.client.guestBookingGroup.findUnique({
      include: { bookings: true },
      where: { id: groupId },
    });
    if (
      !group ||
      group.paymentStatus !== "succeeded" ||
      group.bookings.length === 0 ||
      group.bookings.some(
        (booking) => booking.epteraPaymentSyncStatus !== "succeeded",
      )
    )
      return group;
    return database.client.guestBookingGroup.update({
      data: { status: "confirmed" },
      include: { bookings: { orderBy: { createdAt: "asc" } } },
      where: { id: groupId, paymentStatus: "succeeded" },
    });
  },
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
