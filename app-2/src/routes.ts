import { Router } from "express";
import type { Logger } from "pino";

import { createAdminAuthRouter } from "./features/admin-auth/admin-auth.routes.js";
import { createAdminLeadsRouter } from "./features/admin-leads/admin-leads.routes.js";
import { createAdminOperationsRouter } from "./features/admin-operations/admin-operations.routes.js";
import { createAdminSettingsRouter } from "./features/admin-settings/admin-settings.routes.js";
import { createAgentScenariosRouter } from "./features/agent-scenarios/agent-scenarios.routes.js";
import { createAiAgentService } from "./features/agent/agent.service.js";
import { createBookingRouter } from "./features/booking/booking.routes.js";
import { createEpteraClient } from "./features/booking/eptera.client.js";
import { createYooKassaClient } from "./features/booking/yookassa.client.js";
import { createChatRouter } from "./features/chat/chat.routes.js";
import { createChatService } from "./features/chat/chat.service.js";
import { createGuestAuthRouter } from "./features/guest-auth/guest-auth.routes.js";
import { createKnowledgeBaseRouter } from "./features/knowledge-base/knowledge-base.routes.js";
import { createLeadsRouter } from "./features/leads/leads.routes.js";
import { createMaxBotClient } from "./features/max-bot/max-bot.client.js";
import { createMaxBotRouter } from "./features/max-bot/max-bot.routes.js";
import { createMediaRouter } from "./features/media/media.routes.js";
import { createSiteContentRouter } from "./features/site-content/site-content.routes.js";
import { createSystemRouter } from "./features/system/system.routes.js";
import { createVoiceAgentRouter } from "./features/voice-agent/voice-agent.routes.js";
import type { Database } from "./lib/database/database.js";
import type { ManagedStorageUpload } from "./lib/storage/managed-storage.js";

type CreateApiRouterOptions = {
  readonly database: Database;
  readonly epteraApiKey?: string;
  readonly epteraHotelId?: string;
  readonly openaiApiKey?: string;
  readonly openaiBaseUrl?: string;
  readonly maxBot: {
    readonly token?: string;
    readonly webhookSecret?: string;
    readonly webhookUrl?: string;
    readonly siteUrl?: string;
  };
  readonly yooKassaShopId?: string;
  readonly voiceIntegration: {
    readonly mangoApiBaseUrl?: string;
    readonly mangoConfigured: boolean;
    readonly sbcConfigured: boolean;
    readonly realtimeSipConfigured: boolean;
    readonly t2TransferConfigured: boolean;
    readonly publicWebhookConfigured: boolean;
  };
  readonly yooKassaSecretKey?: string;
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

export const createApiRouter = ({
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
}: CreateApiRouterOptions): Router => {
  const router = Router();
  const chat = createChatService(database);
  const agent = createAiAgentService({
    apiKey: openaiApiKey,
    baseUrl: openaiBaseUrl,
    bookingUrl: "",
    chat,
    database,
    eptera: createEpteraClient({
      apiKey: epteraApiKey,
      hotelId: epteraHotelId,
    }),
    logger,
  });
  router.use(createSystemRouter({ database }));
  router.use("/admin/auth", createAdminAuthRouter(database));
  router.use("/admin/site-leads", createAdminLeadsRouter(database));
  router.use("/admin", createAdminOperationsRouter(database));
  router.use("/admin/settings", createAdminSettingsRouter(database));
  router.use("/admin/agent-scenarios", createAgentScenariosRouter(database));
  router.use("/auth", createGuestAuthRouter(database));
  router.use(
    "/booking",
    createBookingRouter(
      database,
      createEpteraClient({ apiKey: epteraApiKey, hotelId: epteraHotelId }),
      createYooKassaClient({
        secretKey: yooKassaSecretKey,
        shopId: yooKassaShopId,
      }),
    ),
  );
  router.use("/chat", createChatRouter(database, chat, agent));
  router.use(
    "/max",
    createMaxBotRouter({
      agent,
      chat,
      database,
      logger,
      max: createMaxBotClient({ logger, token: maxBot.token }),
      webhookSecret: maxBot.webhookSecret,
      siteUrl: maxBot.siteUrl,
    }),
  );
  router.use("/site-leads", createLeadsRouter(database));
  router.use("/site-content", createSiteContentRouter(database));
  router.use("/media", createMediaRouter(database, managedStorage));
  router.use("/admin/knowledge-base", createKnowledgeBaseRouter(database));
  router.get("/voice-agent/readiness", (_request, response) =>
    response.json({ provider: "mango", ...voiceIntegration }),
  );
  router.use("/voice-agent", createVoiceAgentRouter(database, openaiApiKey));
  return router;
};
