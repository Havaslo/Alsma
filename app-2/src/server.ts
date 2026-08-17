import { createApp } from "./app.js";
import { readConfig } from "./lib/config.js";
import { createDatabase } from "./lib/database/database.js";
import { runDatabaseMigrations } from "./lib/database/migrations.js";
import { createLogger } from "./lib/logger.js";
import { createManagedStorage } from "./lib/storage/managed-storage.js";

const host = "0.0.0.0";
const databaseRetryDelayMilliseconds = 5_000;
const voiceRetentionMilliseconds = 30 * 24 * 60 * 60 * 1_000;

const wait = async (milliseconds: number): Promise<void> => {
  await new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
};

const start = async (): Promise<void> => {
  const config = readConfig();
  const logger = createLogger();
  const database = createDatabase(config.databaseUrl);
  const managedStorage = createManagedStorage(config.managedStorage);
  const app = createApp({
    database,
    logger,
    epteraApiKey: config.epteraApiKey,
    epteraHotelId: config.epteraHotelId,
    managedStorage,
    openaiApiKey: config.openaiApiKey,
    openaiBaseUrl: config.openaiBaseUrl,
    maxBot: config.maxBot,
    vk: config.vk,
    yooKassaSecretKey: config.yooKassaSecretKey,
    yooKassaShopId: config.yooKassaShopId,
    voiceIntegration: config.voiceIntegration,
  });
  const server = app.listen(config.port, host, () => {
    logger.info({ host, port: config.port }, "Backend server started");
  });
  const keepDatabaseReady = async (): Promise<void> => {
    for (;;) {
      try {
        await runDatabaseMigrations(database);
        logger.info("Managed database is ready and migrations are applied");
        return;
      } catch (error) {
        logger.error(
          {
            error: error instanceof Error ? error.message : "Unknown error",
          },
          "Managed database is unavailable; retrying migration startup",
        );
        await wait(databaseRetryDelayMilliseconds);
      }
    }
  };
  void keepDatabaseReady();
  const purgeExpiredVoiceCalls = async (): Promise<void> => {
    try {
      const cutoff = new Date(Date.now() - voiceRetentionMilliseconds);
      const expired = await database.client.voiceCall.findMany({
        where: { createdAt: { lt: cutoff } },
        select: { recordingObjectId: true },
      });
      for (const call of expired) {
        if (call.recordingObjectId)
          await managedStorage
            .deleteObject(call.recordingObjectId)
            .catch(() => undefined);
      }
      await database.client.voiceCall.deleteMany({
        where: { createdAt: { lt: cutoff } },
      });
    } catch (error) {
      logger.warn(
        { error: error instanceof Error ? error.message : "Unknown error" },
        "Voice call retention cleanup failed",
      );
    }
  };
  const retentionTimer = setInterval(
    () => void purgeExpiredVoiceCalls(),
    60 * 60 * 1_000,
  );
  void purgeExpiredVoiceCalls();
  let isShuttingDown = false;
  const shutdown = (signal: NodeJS.Signals) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    clearInterval(retentionTimer);
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

void start().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : "Unknown startup error.";
  process.stderr.write(`Backend startup failed: ${message}\n`);
  process.exitCode = 1;
});
