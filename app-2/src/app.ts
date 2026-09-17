import express, { type Express } from "express";
import helmet from "helmet";
import type { Logger } from "pino";
import { pinoHttp } from "pino-http";

import type { Database } from "./lib/database/database.js";
import { publicCorsMiddleware } from "./lib/http/cors.js";
import { errorHandler } from "./lib/http/error-handler.js";
import { notFoundHandler } from "./lib/http/not-found-handler.js";
import type { ManagedStorage } from "./lib/storage/managed-storage.js";
import { createApiRouter } from "./routes.js";

type CreateAppOptions = {
  readonly corsAllowedOrigins: readonly string[];
  readonly epteraApiKey?: string;
  readonly epteraHotelId?: string;
  readonly epteraPaymentLoginToken?: string;
  readonly openaiApiKey?: string;
  readonly openaiBaseUrl?: string;
  readonly openaiSip: {
    readonly apiKey?: string;
    readonly baseUrl: string;
    readonly webhookSecret?: string;
  };
  readonly voiceConfigurationSecret?: string;
  readonly maxBot: {
    readonly token?: string;
    readonly webhookSecret?: string;
    readonly webhookUrl?: string;
    readonly siteUrl?: string;
  };
  readonly vk: {
    readonly accessToken?: string;
    readonly groupId?: string;
    readonly callbackSecret?: string;
    readonly confirmationCode?: string;
  };
  readonly yooKassaSecretKey?: string;
  readonly yooKassaShopId?: string;
  readonly voiceIntegration: {
    readonly mangoApiBaseUrl?: string;
    readonly mangoApiKey?: string;
    readonly mangoApiSalt?: string;
    readonly mangoConfigured: boolean;
    readonly t2TransferConfigured: boolean;
    readonly publicWebhookConfigured: boolean;
    readonly transferNumber?: string;
  };
  readonly database: Database;
  readonly logger: Logger;
  readonly managedStorage: ManagedStorage;
  readonly mailRu: { readonly email?: string; readonly password?: string };
};

export const mangoExternalEventPaths = [
  "/",
  "/mango/webhook",
  "/events/call",
  "/events/summary",
  "/events/recording",
  "/events/record/added",
  "/result/transfer",
  "/vpbx/result/transfer",
];

export const createApp = ({
  corsAllowedOrigins,
  database,
  epteraApiKey,
  epteraHotelId,
  epteraPaymentLoginToken,
  logger,
  managedStorage,
  mailRu,
  openaiApiKey,
  openaiBaseUrl,
  openaiSip,
  voiceConfigurationSecret,
  maxBot,
  vk,
  yooKassaSecretKey,
  yooKassaShopId,
  voiceIntegration,
}: CreateAppOptions): Express => {
  const app = express();
  app.disable("x-powered-by");
  app.use(publicCorsMiddleware(corsAllowedOrigins));
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
  app.use(express.urlencoded({ extended: false, limit: "512kb" }));
  app.use(
    express.json({
      limit: "12mb",
      verify: (request, _response, buffer) => {
        if (request.url === "/api/voice-agent/sip/incoming")
          (request as typeof request & { rawBody?: Buffer }).rawBody =
            Buffer.from(buffer);
      },
    }),
  );
  app.get("/health", (_request, response) => response.json({ status: "ok" }));
  app.get("/", (_request, response) =>
    response.json({ service: "booking-api", status: "ok" }),
  );
  const apiRouter = createApiRouter({
    database,
    epteraApiKey,
    epteraHotelId,
    epteraPaymentLoginToken,
    logger,
    managedStorage,
    openaiApiKey,
    openaiBaseUrl,
    openaiSip,
    voiceConfigurationSecret,
    maxBot,
    vk,
    yooKassaSecretKey,
    yooKassaShopId,
    voiceIntegration,
    mailRu,
  });
  // Mango appends event paths to the configured external-system origin. Keep
  // the bare origin and every documented event path on the same secured
  // handler so PBX delivery cannot bypass signature validation or persistence.
  app.post(mangoExternalEventPaths, (request, response, next) => {
    request.url = "/voice-agent/mango/webhook";
    apiRouter(request, response, next);
  });
  app.use("/api", apiRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
};
