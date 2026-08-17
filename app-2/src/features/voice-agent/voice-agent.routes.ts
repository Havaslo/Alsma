import { Router } from "express";

import type { Database } from "../../lib/database/database.js";
import { validateRequest } from "../../lib/http/validate-request.js";
import {
  answerHandler,
  asteriskWebhookHandler,
  completeHandler,
  createHandler,
  mangoWebhookHandler,
  toolHandler,
  transcriptHandler,
} from "./voice-agent.handlers.js";
import { createVoiceAgentRepository } from "./voice-agent.repository.js";
import {
  answerBodySchema,
  asteriskWebhookBodySchema,
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
    readonly sbcBaseUrl?: string;
    readonly sbcSecret?: string;
    readonly destination?: string;
    readonly asteriskWebhookSecret?: string;
  },
): Router => {
  const router = Router();
  const webhookSecret = transfer?.asteriskWebhookSecret;
  const protectAsteriskWebhook = (
    request: Parameters<import("express").RequestHandler>[0],
    response: Parameters<import("express").RequestHandler>[1],
    next: Parameters<import("express").RequestHandler>[2],
  ) => {
    if (
      webhookSecret &&
      request.header("x-asterisk-webhook-secret") !== webhookSecret
    ) {
      response
        .status(401)
        .json({ error: "Asterisk webhook is not authorized." });
      return;
    }
    next();
  };
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
    "/asterisk/webhook",
    protectAsteriskWebhook,
    validateRequest({ body: asteriskWebhookBodySchema }),
    asteriskWebhookHandler(service),
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
