import type { Prisma } from "../../generated/prisma/client.js";
import type { Database } from "../../lib/database/database.js";

export const createBookingRepository = (database: Database) => ({
  createGuestBooking: (input: {
    checkInDate: Date;
    checkOutDate: Date;
    contactEmail: string;
    contactPhone: string;
    currency: string;
    epteraReservationId: string | null;
    guestsCount: number;
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
  findOrCreateGuest: (input: {
    email: string;
    fullName: string;
    phone: string;
  }) =>
    database.client.guestUser.upsert({
      create: input,
      update: { email: input.email, fullName: input.fullName },
      where: { phone: input.phone },
    }),
});

export type BookingRepository = ReturnType<typeof createBookingRepository>;
