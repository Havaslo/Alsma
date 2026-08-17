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
} from "./voice-agent.schemas.js";
import { createVoiceAgentService } from "./voice-agent.service.js";

export const createVoiceAgentRouter = (
  database: Database,
  apiKey?: string,
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
    transfer,
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
