import type { RequestHandler } from "express";
import type { Logger } from "pino";

import { createLogger } from "../../lib/logger.js";
import { hasValidAmaziBearer, parseAmaziWebhook } from "./voice-agent.amazi.js";
import type { VoiceAgentService } from "./voice-agent.service.js";

export const createHandler =
  (service: VoiceAgentService): RequestHandler =>
  async (_req, res, next) => {
    try {
      res.status(201).json(await service.createCall(res.locals.input.body));
    } catch (error) {
      next(error);
    }
  };
export const transcriptHandler =
  (service: VoiceAgentService): RequestHandler =>
  async (_req, res, next) => {
    try {
      const result = await service.appendTranscript(
        res.locals.input.params.callId,
        res.locals.input.body,
      );
      if (!result) {
        res.status(404).json({
          error: { code: "CALL_NOT_FOUND", message: "Звонок не найден." },
        });
        return;
      }
      res.json(result);
    } catch (error) {
      next(error);
    }
  };
export const providerTranscriptHandler =
  (service: VoiceAgentService): RequestHandler =>
  async (_req, res, next) => {
    try {
      const result = await service.appendTranscriptByProvider(
        res.locals.input.params.providerCallId,
        res.locals.input.body,
      );
      if (!result) {
        res.status(404).json({
          error: { code: "CALL_NOT_FOUND", message: "Звонок не найден." },
        });
        return;
      }
      res.json(result);
    } catch (error) {
      next(error);
    }
  };
export const answerHandler =
  (service: VoiceAgentService): RequestHandler =>
  async (_req, res, next) => {
    try {
      res.json(
        await service.answer(
          res.locals.input.body.question,
          res.locals.input.body.callId,
        ),
      );
    } catch (error) {
      next(error);
    }
  };
export const completeHandler =
  (service: VoiceAgentService): RequestHandler =>
  async (_req, res, next) => {
    try {
      const result = await service.completeCall(
        res.locals.input.params.callId,
        res.locals.input.body.outcome,
        res.locals.input.body.recordingUrl,
        res.locals.input.body.recordingObjectId,
      );
      if (!result) {
        res.status(404).json({
          error: { code: "CALL_NOT_FOUND", message: "Звонок не найден." },
        });
        return;
      }
      res.json(result);
    } catch (error) {
      next(error);
    }
  };
export const providerCompleteHandler =
  (service: VoiceAgentService): RequestHandler =>
  async (_req, res, next) => {
    try {
      const result = await service.completeCallByProvider(
        res.locals.input.params.providerCallId,
        res.locals.input.body.outcome,
        res.locals.input.body.recordingUrl,
        res.locals.input.body.recordingObjectId,
      );
      if (!result) {
        res.status(404).json({
          error: { code: "CALL_NOT_FOUND", message: "Звонок не найден." },
        });
        return;
      }
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

export const mangoWebhookHandler =
  (service: VoiceAgentService): RequestHandler =>
  async (_req, res, next) => {
    try {
      const result = await service.handleMangoWebhook(res.locals.input.body);
      res.status(200).json({
        duplicate:
          result && typeof result === "object" && "duplicate" in result
            ? result.duplicate
            : undefined,
        received: true,
      });
    } catch (error) {
      next(error);
    }
  };

export const createAmaziWebhookHandler =
  ({
    closeRelay,
    greetRelay,
    logger = createLogger(),
    secret,
    service,
  }: {
    readonly closeRelay: (sessionId: string) => void;
    readonly greetRelay?: (sessionId: string) => void;
    readonly logger?: Logger;
    readonly secret?: string;
    readonly service: VoiceAgentService;
  }): RequestHandler =>
  async (request, response, next) => {
    let claimedEventKey: string | undefined;
    let stage = "authorization";
    const logFailure = (failureStage: string, error: unknown) => {
      const errorCode =
        error && typeof error === "object" && "code" in error
          ? typeof error.code === "string"
            ? error.code
            : "unknown"
          : error instanceof Error
            ? error.name
            : "unknown";
      logger.error(
        { errorCode, stage: failureStage },
        "Amazi webhook processing failed",
      );
    };
    try {
      if (
        secret &&
        !hasValidAmaziBearer(request.header("authorization"), secret)
      ) {
        response.status(401).json({
          error: { code: "invalid_amazi_webhook_authorization" },
        });
        return;
      }
      stage = "parse";
      const event = parseAmaziWebhook({
        body: request.body,
        headerSessionId: request.header("x-amazi-session-id"),
      });
      stage = "claim";
      const claimed = await service.claimAmaziWebhook(event);
      if (!claimed) {
        response.status(202).json({ duplicate: true, received: true });
        return;
      }
      claimedEventKey = event.eventKey;
      void (async () => {
        try {
          // Media is ready at connected; configuration alone is too early.
          if (event.eventType === "voice.call.connected")
            greetRelay?.(event.sessionId);
          await service.handleAmaziWebhook(event);
          if (
            event.eventType === "voice.call.completed" ||
            event.eventType === "voice.call.failed"
          )
            closeRelay(event.sessionId);
        } catch (error) {
          logFailure("lifecycle", error);
          await service
            .releaseAmaziWebhook(event.eventKey)
            .catch((releaseError) => logFailure("release_claim", releaseError));
        }
      })();
      response.status(202).json({ received: true });
    } catch (error) {
      if (claimedEventKey)
        await service
          .releaseAmaziWebhook(claimedEventKey)
          .catch((releaseError) => logFailure("release_claim", releaseError));
      logFailure(stage, error);
      next(error);
    }
  };

export const toolHandler =
  (service: VoiceAgentService): RequestHandler =>
  async (_req, res, next) => {
    try {
      res.json(await service.tool(res.locals.input.body));
    } catch (error) {
      next(error);
    }
  };
