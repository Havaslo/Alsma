import { createApp } from "./app.js";
import { readConfig } from "./lib/config.js";
import { createDatabase } from "./lib/database/database.js";
import { runDatabaseMigrations } from "./lib/database/migrations.js";
import { createLogger } from "./lib/logger.js";
import { createManagedStorage } from "./lib/storage/managed-storage.js";

const host = "0.0.0.0";

const start = async (): Promise<void> => {
  const config = readConfig();
  const logger = createLogger();
  const database = createDatabase(config.databaseUrl);
  const managedStorage = createManagedStorage(config.managedStorage);
  try {
    await runDatabaseMigrations(database);
  } catch (error) {
    await database.close().catch(() => undefined);
    throw error;
  }
  const app = createApp({
    database,
    logger,
    epteraApiKey: config.epteraApiKey,
    epteraHotelId: config.epteraHotelId,
    managedStorage,
    openaiApiKey: config.openaiApiKey,
    yooKassaSecretKey: config.yooKassaSecretKey,
    yooKassaShopId: config.yooKassaShopId,
  });
  const server = app.listen(config.port, host, () => {
    logger.info({ host, port: config.port }, "Backend server started");
  });
  let isShuttingDown = false;
  const shutdown = (signal: NodeJS.Signals) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info({ signal }, "Backend server stopping");
    server.close((serverError) => {
      void database
        .close()
        .catch(() => {
          logger.error("Database connection shutdown failed");
          process.exitCode = 1;
        })
        .finally(() => {
          if (serverError) {
            logger.error("Backend server shutdown failed");
            process.exitCode = 1;
          }
        });
    });
  };
  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
};

void start().catch(() => {
  process.stderr.write("Backend startup failed.\n");
  process.exitCode = 1;
});
