import express, { type Express } from "express";
import helmet from "helmet";
import type { Logger } from "pino";
import { pinoHttp } from "pino-http";

import type { Database } from "./lib/database/database.js";
import { publicCorsMiddleware } from "./lib/http/cors.js";
import { errorHandler } from "./lib/http/error-handler.js";
import { notFoundHandler } from "./lib/http/not-found-handler.js";
import type { ManagedStorageUpload } from "./lib/storage/managed-storage.js";
import { createApiRouter } from "./routes.js";

type CreateAppOptions = {
  readonly epteraApiKey?: string;
  readonly epteraHotelId?: string;
  readonly openaiApiKey?: string;
  readonly openaiBaseUrl?: string;
  readonly maxBot: {
    readonly token?: string;
    readonly webhookSecret?: string;
    readonly webhookUrl?: string;
  };
  readonly yooKassaSecretKey?: string;
  readonly yooKassaShopId?: string;
  readonly voiceIntegration: {
    readonly mangoApiBaseUrl?: string;
    readonly mangoConfigured: boolean;
    readonly sbcConfigured: boolean;
    readonly realtimeSipConfigured: boolean;
    readonly t2TransferConfigured: boolean;
    readonly publicWebhookConfigured: boolean;
  };
  readonly database: Database;
  readonly logger: Logger;
  readonly managedStorage: {
    readonly upload: (input: {
      readonly content: Uint8Array;
      readonly contentType: string;
      readonly name: string;
    }) => Promise<ManagedStorageUpload>;
    readonly getDownload: (
      objectId: string,
    ) => Promise<{ readonly downloadUrl: string }>;
  };
};

export const createApp = ({
  database,
  epteraApiKey,
  epteraHotelId,
  logger,
  managedStorage,
  openaiApiKey,
  openaiBaseUrl,
  maxBot,
  yooKassaSecretKey,
  yooKassaShopId,
  voiceIntegration,
}: CreateAppOptions): Express => {
  const app = express();
  app.disable("x-powered-by");
  app.use(publicCorsMiddleware);
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
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
  app.get("/health", (_request, response) => response.json({ status: "ok" }));
  app.use(
    "/api",
    createApiRouter({
      database,
      epteraApiKey,
      epteraHotelId,
      logger,
      managedStorage,
      openaiApiKey,
      openaiBaseUrl,
      maxBot,
      yooKassaSecretKey,
      yooKassaShopId,
      voiceIntegration,
    }),
  );
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
};
