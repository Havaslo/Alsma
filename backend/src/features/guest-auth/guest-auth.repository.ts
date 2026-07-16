import type { Database } from "../../lib/database/database.js";

export const createGuestAuthRepository = (database: Database) => ({
  completeProfile: (userId: string, fullName: string) =>
    database.client.guestUser.update({
      data: { fullName },
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
  findCode: (id: string) =>
    database.client.guestLoginCode.findUnique({ where: { id } }),
  findSession: (tokenHash: string) =>
    database.client.guestLoginCode.findFirst({
      include: { user: true },
      where: {
        codeHash: tokenHash,
        consumedAt: { not: null },
        expiresAt: { gt: new Date() },
      },
    }),
  findUserByEmail: (email: string) =>
    database.client.guestUser.findFirst({ where: { email } }),
  findUserByPhone: (phone: string) =>
    database.client.guestUser.findUnique({ where: { phone } }),
});

export type GuestAuthRepository = ReturnType<typeof createGuestAuthRepository>;
