import express, { type Express } from "express";
import helmet from "helmet";
import type { Logger } from "pino";
import { pinoHttp } from "pino-http";

import type { Database } from "./lib/database/database.js";
import { errorHandler } from "./lib/http/error-handler.js";
import { notFoundHandler } from "./lib/http/not-found-handler.js";
import { createApiRouter } from "./routes.js";

type CreateAppOptions = {
  readonly database: Database;
  readonly logger: Logger;
};

export const createApp = ({ database, logger }: CreateAppOptions): Express => {
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
  app.use("/api", createApiRouter({ database }));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
