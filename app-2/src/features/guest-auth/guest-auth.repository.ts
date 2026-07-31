import type { Database } from "../../lib/database/database.js";

const guestInclude = {
  bonusProgram: true,
  bookings: { orderBy: { checkInDate: "desc" as const } },
} as const;

export const createGuestAuthRepository = (database: Database) => ({
  completeProfile: (userId: string, fullName: string) =>
    database.client.guestUser.update({
      data: { fullName },
      include: guestInclude,
      where: { id: userId },
    }),
  consumeCode: (id: string, sessionHash: string, sessionExpiresAt: Date) =>
    database.client.guestLoginCode.update({
      data: {
        codeHash: sessionHash,
        consumedAt: new Date(),
        expiresAt: sessionExpiresAt,
      },
      where: { id },
    }),
  createCode: (input: {
    codeHash: string;
    expiresAt: Date;
    phone: string;
    userId: string;
  }) => database.client.guestLoginCode.create({ data: input }),
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
  findCode: (id: string) =>
    database.client.guestLoginCode.findUnique({ where: { id } }),
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
    database.client.guestUser.findFirst({ where: { email } }),
  findUserByPhone: (phone: string) =>
    database.client.guestUser.findUnique({ where: { phone } }),
});

export type GuestAuthRepository = ReturnType<typeof createGuestAuthRepository>;
