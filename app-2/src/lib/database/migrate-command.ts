import { readConfig } from "../config.js";
import { createDatabase } from "./database.js";
import { runDatabaseMigrations } from "./migrations.js";

const run = async (): Promise<void> => {
  const config = readConfig();
  const database = createDatabase(config.databaseUrl);

  try {
    await runDatabaseMigrations(database);
  } finally {
    await database.close();
  }
};

void run().catch(() => {
  process.stderr.write("Database migration failed.\n");
  process.exitCode = 1;
});
