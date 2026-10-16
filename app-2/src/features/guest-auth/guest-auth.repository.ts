import type { Database } from "../../lib/database/database.js";
import { createLegalAcceptance } from "../../lib/legal/consent.js";

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
    legalAcceptances: ReturnType<typeof createLegalAcceptance>[];
    messageId: string;
    userId?: string;
  }) => database.client.guestEmailVerification.create({ data: input }),
  updateVerificationForResend: (
    id: string,
    input: {
      codeHash: string;
      expiresAt: Date;
      legalAcceptances: ReturnType<typeof createLegalAcceptance>[];
    },
  ) =>
    database.client.guestEmailVerification.update({
      where: { id },
      data: {
        attempts: 0,
        codeHash: input.codeHash,
        expiresAt: input.expiresAt,
        lastSentAt: new Date(),
        legalAcceptances: input.legalAcceptances,
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
    database.client.$transaction(async (transaction) => {
      await transaction.guestUser.updateMany({
        data: { fullName, fullNameConfirmedAt: new Date() },
        where: { fullNameConfirmedAt: null, id: userId },
      });
      return transaction.guestUser.findUniqueOrThrow({
        include: guestInclude,
        where: { id: userId },
      });
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
