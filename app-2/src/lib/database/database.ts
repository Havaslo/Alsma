import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../../generated/prisma/client.js";

export type DatabaseClient = PrismaClient;

export type DatabaseHealth = {
  readonly check: () => Promise<void>;
};

export type Database = DatabaseHealth & {
  readonly client: DatabaseClient;
  readonly close: () => Promise<void>;
};

export const createDatabase = (databaseUrl: string): Database => {
  const adapter = new PrismaPg({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
    max: 10,
  });
  const client = new PrismaClient({ adapter });

  return {
    check: async () => {
      await client.$queryRaw`SELECT 1`;
    },
    client,
    close: async () => {
      await client.$disconnect();
    },
  };
};
