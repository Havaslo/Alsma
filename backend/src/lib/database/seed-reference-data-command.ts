import { readConfig } from "../config.js";
import { type DatabaseClient, createDatabase } from "./database.js";
import {
  referenceAdminRequests,
  referenceAgentRules,
  referenceAgentScenarios,
  referenceBookingRequests,
  referenceGuestBonusPrograms,
  referenceGuestBookings,
  referenceGuestUsers,
  referenceKnowledgeArticles,
  referenceKnowledgeChunks,
  referenceManagerTasks,
  referenceSiteLeads,
  referenceTransferRules,
} from "./reference-test-data.js";

const upsertRows = async <Row extends { id: string }>(
  rows: readonly Row[],
  upsert: (row: Row) => Promise<unknown>,
): Promise<void> => {
  await Promise.all(rows.map(upsert));
};

const seedReferenceData = async (client: DatabaseClient): Promise<void> => {
  await client.$transaction(async (transaction) => {
    await upsertRows(referenceGuestUsers, (row) =>
      transaction.guestUser.upsert({
        create: row,
        update: row,
        where: { id: row.id },
      }),
    );
    await upsertRows(referenceGuestBonusPrograms, (row) =>
      transaction.guestBonusProgram.upsert({
        create: row,
        update: row,
        where: { id: row.id },
      }),
    );
    await upsertRows(referenceGuestBookings, (row) =>
      transaction.guestBooking.upsert({
        create: row,
        update: row,
        where: { id: row.id },
      }),
    );
    await upsertRows(referenceSiteLeads, (row) =>
      transaction.siteLead.upsert({
        create: row,
        update: row,
        where: { id: row.id },
      }),
    );
    await upsertRows(referenceBookingRequests, (row) =>
      transaction.bookingRequest.upsert({
        create: row,
        update: row,
        where: { id: row.id },
      }),
    );
    await upsertRows(referenceAdminRequests, (row) =>
      transaction.adminRequest.upsert({
        create: row,
        update: row,
        where: { id: row.id },
      }),
    );
    await upsertRows(referenceManagerTasks, (row) =>
      transaction.managerTask.upsert({
        create: row,
        update: row,
        where: { id: row.id },
      }),
    );
    await upsertRows(referenceKnowledgeArticles, (row) =>
      transaction.knowledgeArticle.upsert({
        create: row,
        update: row,
        where: { id: row.id },
      }),
    );
    await upsertRows(referenceKnowledgeChunks, (row) =>
      transaction.knowledgeChunk.upsert({
        create: row,
        update: row,
        where: { id: row.id },
      }),
    );
    await upsertRows(referenceAgentRules, (row) =>
      transaction.agentRule.upsert({
        create: row,
        update: row,
        where: { id: row.id },
      }),
    );
    await upsertRows(referenceAgentScenarios, (row) =>
      transaction.agentScenario.upsert({
        create: row,
        update: row,
        where: { id: row.id },
      }),
    );
    await upsertRows(referenceTransferRules, (row) =>
      transaction.agentTransferRule.upsert({
        create: row,
        update: row,
        where: { id: row.id },
      }),
    );
  });
};

const run = async (): Promise<void> => {
  const config = readConfig();
  const database = createDatabase(config.databaseUrl);

  try {
    await seedReferenceData(database.client);
    process.stdout.write("Reference test data is ready.\n");
  } finally {
    await database.close();
  }
};

void run().catch(() => {
  process.stderr.write("Reference test data could not be seeded.\n");
  process.exitCode = 1;
});
