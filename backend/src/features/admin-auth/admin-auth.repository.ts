import type { Database } from "../../lib/database/database.js";

export const createAdminAuthRepository = (database: Database) => ({
  countUsers: () => database.client.adminUser.count(),
  createSession: (input: {
    expiresAt: Date;
    tokenHash: string;
    userId: string;
  }) => database.client.adminSession.create({ data: input }),
  createUser: (input: {
    displayName: string;
    email: string;
    passwordHash: string;
  }) =>
    database.client.$transaction(async (transaction) => {
      const role = await transaction.adminRole.upsert({
        create: { name: "Administrator", permissions: ["*"] },
        update: {},
        where: { name: "Administrator" },
      });
      return transaction.adminUser.create({
        data: { ...input, roleId: role.id },
        include: { role: true },
      });
    }),
  findSession: (tokenHash: string) =>
    database.client.adminSession.findFirst({
      include: { user: { include: { role: true } } },
      where: {
        expiresAt: { gt: new Date() },
        tokenHash,
        user: { status: "active" },
      },
    }),
  findUserByEmail: (email: string) =>
    database.client.adminUser.findUnique({
      include: { role: true },
      where: { email },
    }),
});

export type AdminAuthRepository = ReturnType<typeof createAdminAuthRepository>;
