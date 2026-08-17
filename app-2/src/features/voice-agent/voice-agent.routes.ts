import { Router } from "express";

import type { Database } from "../../lib/database/database.js";
import { validateRequest } from "../../lib/http/validate-request.js";
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
import { createVoiceAgentService } from "./voice-agent.service.js";

export const createVoiceAgentRouter = (
  database: Database,
  apiKey?: string,
  openaiBaseUrl?: string,
  transfer?: {
    readonly mangoApiKey?: string;
    readonly mangoApiSalt?: string;
    readonly destination?: string;
  },
): Router => {
  const router = Router();
  const service = createVoiceAgentService(
    createVoiceAgentRepository(database),
    apiKey,
    openaiBaseUrl,
    transfer,
  );
  router.post("/realtime/session", async (_request, response, next) => {
    try {
      response.json(await service.createRealtimeSession());
    } catch (error) {
      next(error);
    }
  });
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
