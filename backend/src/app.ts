import express, { type Express } from "express";
import helmet from "helmet";
import type { Logger } from "pino";
import { pinoHttp } from "pino-http";

import type { Database } from "./lib/database/database.js";
import { errorHandler } from "./lib/http/error-handler.js";
import { notFoundHandler } from "./lib/http/not-found-handler.js";
import type { ManagedStorageUpload } from "./lib/storage/managed-storage.js";
import { createApiRouter } from "./routes.js";

type CreateAppOptions = {
  readonly database: Database;
  readonly logger: Logger;
  readonly managedStorage: {
    readonly createUpload: (input: {
      readonly contentType: string;
      readonly name: string;
      readonly sizeBytes: number;
    }) => Promise<ManagedStorageUpload>;
    readonly getDownload: (
      objectId: string,
    ) => Promise<{ readonly downloadUrl: string }>;
  };
};

export const createApp = ({
  database,
  logger,
  managedStorage,
}: CreateAppOptions): Express => {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    pinoHttp({
      autoLogging: {
        ignore: (request) =>
          request.method === "GET" && request.url === "/health",
      },
      logger,
    }),
  );
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_request, response) => {
    response.json({ status: "ok" });
  });
  app.use("/api", createApiRouter({ database, managedStorage }));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
