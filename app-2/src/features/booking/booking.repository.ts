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
    epteraReservationId: string | null;
    guestsCount: number;
    guestList: Prisma.InputJsonValue;
    roomName: string;
    selectedOffer: Prisma.InputJsonValue;
    totalAmount: number;
    userId: string;
    voucherNumber: string | null;
  }) =>
    database.client.guestBooking.create({
      data: {
        ...input,
        paymentStatus: "payment_pending",
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
