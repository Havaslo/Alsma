import type { Database } from "../../lib/database/database.js";

const guestInclude = {
  bonusProgram: true,
  bookings: { orderBy: { checkInDate: "desc" as const } },
  serviceOrders: {
    orderBy: { createdAt: "desc" as const },
    include: {
      items: { include: { service: true, variant: true, booking: true } },
      paymentAttempts: { orderBy: { createdAt: "desc" as const } },
    },
  },
} as const;

export const createGuestAuthRepository = (database: Database) => ({
  createVerification: (input: {
    email: string;
    codeHash: string;
    expiresAt: Date;
    messageId: string;
    userId?: string;
  }) => database.client.guestEmailVerification.create({ data: input }),
  updateVerificationForResend: (
    id: string,
    input: {
      codeHash: string;
      expiresAt: Date;
    },
  ) =>
    database.client.guestEmailVerification.update({
      where: { id },
      data: {
        attempts: 0,
        codeHash: input.codeHash,
        expiresAt: input.expiresAt,
        lastSentAt: new Date(),
        sentAt: null,
      },
    }),
  markVerificationSent: (id: string) =>
    database.client.guestEmailVerification.updateMany({
      where: { id, consumedAt: null, sentAt: null },
      data: { sentAt: new Date() },
    }),
  findRecentVerification: (email: string) =>
    database.client.guestEmailVerification.findFirst({
      where: { email, consumedAt: null },
      orderBy: { createdAt: "desc" },
    }),
  findUserById: (id: string) =>
    database.client.guestUser.findUnique({ where: { id } }),
  consumeVerification: (id: string) =>
    database.client.guestEmailVerification.updateMany({
      where: { id, consumedAt: null },
      data: { consumedAt: new Date() },
    }),
  incrementVerificationAttempts: (id: string) =>
    database.client.guestEmailVerification.updateMany({
      where: { id, consumedAt: null, attempts: { lt: 5 } },
      data: { attempts: { increment: 1 } },
    }),
  completeProfile: (userId: string, fullName: string) =>
    database.client.guestUser.update({
      data: { fullName },
      include: guestInclude,
      where: { id: userId },
    }),
  createSession: (input: {
    phone: string;
    sessionHash: string;
    sessionExpiresAt: Date;
    userId: string;
  }) =>
    database.client.guestLoginCode.create({
      data: {
        codeHash: input.sessionHash,
        consumedAt: new Date(),
        expiresAt: input.sessionExpiresAt,
        phone: input.phone,
        userId: input.userId,
      },
    }),
  createUser: (input: { email?: string; phone: string }) =>
    database.client.guestUser.create({ data: input }),
  provisionDemoProfile: (userId: string) =>
    database.client.$transaction(async (transaction) => {
      const user = await transaction.guestUser.findUnique({
        include: guestInclude,
        where: { id: userId },
      });
      if (!user) return null;
      if (user.fullName || user.bonusProgram || user.bookings.length)
        return user;
      return transaction.guestUser.update({
        data: {
          bonusProgram: {
            create: { balance: 2_400, level: "Silver" },
          },
          bookings: {
            create: [
              {
                checkInDate: new Date("2025-09-12"),
                checkOutDate: new Date("2025-09-15"),
                guestsCount: 2,
                roomName: "SPA-weekend в лесном корпусе",
                status: "Подтверждено",
                totalAmount: 84_000,
              },
              {
                checkInDate: new Date("2025-01-03"),
                checkOutDate: new Date("2025-01-07"),
                guestsCount: 3,
                roomName: "Семейный заезд с all inclusive",
                status: "Завершено",
                totalAmount: 126_500,
              },
            ],
          },
          fullName: "Гость АЛСМА",
        },
        include: guestInclude,
        where: { id: userId },
      });
    }),
  findSession: (tokenHash: string) =>
    database.client.guestLoginCode.findFirst({
      include: { user: { include: guestInclude } },
      where: {
        codeHash: tokenHash,
        consumedAt: { not: null },
        expiresAt: { gt: new Date() },
      },
    }),
  revokeSession: (tokenHash: string) =>
    database.client.guestLoginCode.deleteMany({
      where: { codeHash: tokenHash, consumedAt: { not: null } },
    }),
  findUserByEmail: (email: string) =>
    database.client.guestUser.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      orderBy: { createdAt: "asc" },
    }),
  findUserByPhone: (phone: string) =>
    database.client.guestUser.findUnique({ where: { phone } }),
});

export type GuestAuthRepository = ReturnType<typeof createGuestAuthRepository>;
