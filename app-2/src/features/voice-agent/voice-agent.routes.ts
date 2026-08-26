import { Router } from "express";

import type { Database } from "../../lib/database/database.js";
import { validateRequest } from "../../lib/http/validate-request.js";
import type { ManagedStorage } from "../../lib/storage/managed-storage.js";
import { createEpteraClient } from "../booking/eptera.client.js";
import { formatEventsContext, listPublishedEvents } from "./events-context.js";
import {
  createVoiceConfigurationHandler,
  voiceTestCompletedHandler,
} from "./voice-agent.configuration.js";
import {
  answerHandler,
  completeHandler,
  createHandler,
  mangoWebhookHandler,
  toolHandler,
  transcriptHandler,
} from "./voice-agent.handlers.js";
import { createVoiceAgentRepository } from "./voice-agent.repository.js";
import {
  answerBodySchema,
  callParamsSchema,
  completeCallBodySchema,
  createCallBodySchema,
  mangoWebhookBodySchema,
  toolBodySchema,
  transcriptBodySchema,
  voiceTestTurnBodySchema,
} from "./voice-agent.schemas.js";
import {
  createVoiceAgentService,
  recordingDisclosure,
  voiceAgentSystemPrompt,
} from "./voice-agent.service.js";
import { createOpenAiSipHandler } from "./voice-agent.sip.js";

export const createVoiceAgentRouter = (
  database: Database,
  apiKey?: string,
  openaiBaseUrl?: string,
  eptera?: { apiKey?: string; hotelId?: string },
  transfer?: {
    readonly mangoApiKey?: string;
    readonly mangoApiSalt?: string;
    readonly destination?: string;
  },
  managedStorage?: ManagedStorage,
  openaiSip?: {
    readonly apiKey?: string;
    readonly baseUrl: string;
    readonly webhookSecret?: string;
  },
  voiceConfigurationSecret?: string,
): Router => {
  const router = Router();
  const service = createVoiceAgentService(
    createVoiceAgentRepository(database),
    database,
    apiKey,
    openaiBaseUrl,
    createEpteraClient(eptera ?? {}),
    transfer,
    managedStorage,
  );
  const sipReady = Boolean(openaiSip?.apiKey && openaiSip.webhookSecret);
  router.get("/sip/status", (_request, response) =>
    response.json({
      ready: sipReady,
      provider: "openai",
      realtimeWebSocket: true,
      sipCallsApi: true,
      reason: sipReady ? undefined : "Прямой OpenAI SIP не настроен.",
    }),
  );
  router.get(
    "/configuration",
    createVoiceConfigurationHandler(database, voiceConfigurationSecret),
  );
  router.post("/configuration", voiceTestCompletedHandler);
  router.post(
    "/sip/incoming",
    createOpenAiSipHandler({
      apiKey: openaiSip?.apiKey,
      baseUrl: openaiSip?.baseUrl ?? "https://api.openai.com/v1",
      getInstructions: async () => {
        const knowledge =
          await createVoiceAgentRepository(database).getKnowledgeContext();
        const events = await listPublishedEvents(database).catch(() => []);
        return `${voiceAgentSystemPrompt}\n\nПервой фразой сообщи: ${recordingDisclosure}\n\nБаза знаний и правила:\n${knowledge}\n\nОпубликованный календарь мероприятий (только эти данные):\n${formatEventsContext(events) || "Нет опубликованных актуальных мероприятий."}\nНе придумывай мероприятия и даты. Если в календаре нет ответа, скажи, что у тебя нет этой информации, и предложи уточнить у менеджера.`;
      },
      webhookSecret: openaiSip?.webhookSecret,
    }),
  );
  router.post(
    "/test/turn",
    validateRequest({ body: voiceTestTurnBodySchema }),
    async (_request, response, next) => {
      try {
        const input = response.locals.input.body;
        response.json(
          await service.testAudioTurn(input.audioBase64, input.mimeType),
        );
      } catch (error) {
        next(error);
      }
    },
  );
  router.post(
    "/mango/webhook",
    validateRequest({ body: mangoWebhookBodySchema }),
    mangoWebhookHandler(service),
  );
  router.post(
    "/tools",
    validateRequest({ body: toolBodySchema }),
    toolHandler(service),
  );
  router.post(
    "/calls",
    validateRequest({ body: createCallBodySchema }),
    createHandler(service),
  );
  router.post(
    "/calls/:callId/transcript",
    validateRequest({ params: callParamsSchema, body: transcriptBodySchema }),
    transcriptHandler(service),
  );
  router.post(
    "/calls/:callId/complete",
    validateRequest({ params: callParamsSchema, body: completeCallBodySchema }),
    completeHandler(service),
  );
  router.post(
    "/answer",
    validateRequest({ body: answerBodySchema }),
    answerHandler(service),
  );
  return router;
};
