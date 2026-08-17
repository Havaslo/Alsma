import type { RequestHandler } from "express";

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

export const mangoWebhookHandler =
  (service: VoiceAgentService): RequestHandler =>
  async (_req, res, next) => {
    try {
      res
        .status(200)
        .json(await service.handleMangoWebhook(res.locals.input.body));
    } catch (error) {
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
