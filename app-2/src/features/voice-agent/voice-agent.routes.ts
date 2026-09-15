import { Router } from "express";
import type { Logger } from "pino";

import type { Database } from "../../lib/database/database.js";
import { validateRequest } from "../../lib/http/validate-request.js";
import { createEpteraClient } from "../booking/eptera.client.js";
import { createAmaziEventRelay } from "./voice-agent.amazi.relay.js";
import {
  createVoiceConfigurationHandler,
  voiceTestCompletedHandler,
} from "./voice-agent.configuration.js";
import {
  answerHandler,
  completeHandler,
  createAmaziWebhookHandler,
  createHandler,
  mangoWebhookHandler,
  providerCompleteHandler,
  providerTranscriptHandler,
  toolHandler,
  transcriptHandler,
} from "./voice-agent.handlers.js";
import { parseMangoWebhook } from "./voice-agent.mango.js";
import { getVoiceInstructions } from "./voice-agent.prompt.js";
import { createVoiceAgentRepository } from "./voice-agent.repository.js";
import {
  answerBodySchema,
  callParamsSchema,
  completeCallBodySchema,
  createCallBodySchema,
  providerCallParamsSchema,
  toolBodySchema,
  transcriptBodySchema,
  voiceTestTurnBodySchema,
} from "./voice-agent.schemas.js";
import { createVoiceAgentService } from "./voice-agent.service.js";
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
    readonly openaiSipApiKey?: string;
    readonly openaiSipBaseUrl?: string;
  },
  openaiSip?: {
    readonly apiKey?: string;
    readonly baseUrl: string;
    readonly webhookSecret?: string;
  },
  voiceConfigurationSecret?: string,
  logger?: Logger,
): Router => {
  const router = Router();
  const service = createVoiceAgentService(
    createVoiceAgentRepository(database),
    database,
    apiKey,
    openaiBaseUrl,
    createEpteraClient(eptera ?? {}),
    {
      ...transfer,
      openaiSipApiKey: openaiSip?.apiKey,
      openaiSipBaseUrl: openaiSip?.baseUrl,
    },
  );
  const amaziRelay = createAmaziEventRelay({
    authorizationToken: apiKey,
    logger,
    service,
  });
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
    createVoiceConfigurationHandler(
      database,
      voiceConfigurationSecret,
      async ({ eventRelayUrl, providerCallId, sessionId }) => {
        await service.ensureAmaziCall({ sessionId });
        if (eventRelayUrl)
          amaziRelay.connect({
            eventRelayUrl,
            providerCallId,
            sessionId,
          });
      },
    ),
  );
  router.post("/configuration", voiceTestCompletedHandler);
  router.post(
    "/sip/incoming",
    createOpenAiSipHandler({
      apiKey: openaiSip?.apiKey,
      baseUrl: openaiSip?.baseUrl ?? "https://api.openai.com/v1",
      getInstructions: () => getVoiceInstructions(database),
      onIncomingCall: async (providerCallId) => {
        await service.ensureProviderCall({
          provider: "openai",
          providerCallId,
        });
      },
      onToolCall: (providerCallId, name, args) =>
        service.toolForProviderCall(providerCallId, name, args),
      onTranscript: async (providerCallId, role, text, providerEventId) => {
        await service.appendTranscriptByProvider(providerCallId, {
          role,
          text,
          providerEventId,
        });
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
    (request, response, next) => {
      try {
        response.locals.input = {
          body: parseMangoWebhook({
            apiKey: transfer?.mangoApiKey,
            body: request.body,
            salt: transfer?.mangoApiSalt,
          }),
        };
        next();
      } catch (error) {
        next(error);
      }
    },
    mangoWebhookHandler(service),
  );
  router.post(
    "/amazi/webhook",
    createAmaziWebhookHandler({
      closeRelay: amaziRelay.close,
      logger,
      secret: voiceConfigurationSecret,
      service,
    }),
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
    "/calls/provider/:providerCallId/transcript",
    validateRequest({
      body: transcriptBodySchema,
      params: providerCallParamsSchema,
    }),
    providerTranscriptHandler(service),
  );
  router.post(
    "/calls/provider/:providerCallId/complete",
    validateRequest({
      body: completeCallBodySchema,
      params: providerCallParamsSchema,
    }),
    providerCompleteHandler(service),
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
