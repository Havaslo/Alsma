import { Router } from "express";
import { createHash } from "node:crypto";
import type { Logger } from "pino";
import { z } from "zod";

import type { Database } from "../../lib/database/database.js";
import type { AiAgentService } from "../agent/agent.service.js";
import type { ChatService } from "../chat/chat.service.js";
import type { MaxBotClient } from "./max-bot.client.js";

const updateSchema = z.record(z.string(), z.unknown());
const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const firstString = (...values: unknown[]) =>
  values
    .find(
      (value): value is string =>
        typeof value === "string" && Boolean(value.trim()),
    )
    ?.trim();
const conversationIdFor = (chatId: string) => {
  const digest = createHash("md5").update(`max:${chatId}`).digest();
  digest[6] = (digest[6]! & 0x0f) | 0x30;
  digest[8] = (digest[8]! & 0x3f) | 0x80;
  const hex = digest.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};
const extractMessage = (payload: Record<string, unknown>) => {
  const message = asRecord(payload.message ?? payload);
  const body = asRecord(message.body);
  const recipient = asRecord(message.recipient);
  const chatId = firstString(
    recipient.chat_id,
    message.chat_id,
    payload.chat_id,
    payload.user_id,
  );
  const text = firstString(body.text, message.text, payload.text);
  const sender = asRecord(message.sender);
  const senderId = firstString(sender.user_id, sender.id, payload.user_id);
  const updateType = firstString(payload.update_type, payload.type);
  return { chatId, senderId, text, updateType };
};

export const createMaxBotRouter = ({
  agent,
  chat,
  database,
  logger,
  max,
  webhookSecret,
}: {
  readonly agent: AiAgentService;
  readonly chat: ChatService;
  readonly database: Database;
  readonly logger: Logger;
  readonly max: MaxBotClient;
  readonly webhookSecret?: string;
}): Router => {
  const router = Router();
  router.get("/readiness", (_request, response) =>
    response.json({ provider: "max", configured: max.configured }),
  );
  router.post("/webhook", async (request, response, next) => {
    try {
      if (
        webhookSecret &&
        (request.header("x-max-webhook-secret") ??
          request.header("x-max-bot-secret-token")) !== webhookSecret
      ) {
        response.status(401).json({ error: "MAX webhook is not authorized." });
        return;
      }
      const parsed = updateSchema.safeParse(request.body);
      if (!parsed.success) {
        response.status(400).json({ error: "Invalid MAX webhook payload." });
        return;
      }
      const { chatId, senderId, text, updateType } = extractMessage(
        parsed.data,
      );
      if (updateType && updateType !== "message_created") {
        response.sendStatus(200);
        return;
      }
      if (!chatId || !text || !senderId) {
        response.sendStatus(200);
        return;
      }
      const conversationId = conversationIdFor(chatId);
      await database.client.adminRequest.upsert({
        where: { id: conversationId },
        create: {
          id: conversationId,
          category: "MAX",
          contact: `max:${senderId}`,
          description: text,
          details: { channelType: "chat", source: "MAX", maxChatId: chatId },
          requester: `MAX ${senderId}`,
          status: "new",
          title: "Сообщение из MAX",
        },
        update: {
          contact: `max:${senderId}`,
          description: text,
          updatedAt: new Date(),
        },
      });
      await chat.publish(conversationId, "guest", text);
      const result = await agent.reply(conversationId, text);
      const answer =
        result?.answer ??
        "Не удалось сформировать ответ автоматически. Попробуйте ещё раз.";
      await max.sendMessage({ chatId, text: answer });
      response.sendStatus(200);
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : "Unknown error" },
        "MAX webhook processing failed",
      );
      next(error);
    }
  });
  return router;
};
