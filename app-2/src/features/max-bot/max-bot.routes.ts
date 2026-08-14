import { Router } from "express";
import { createHash } from "node:crypto";
import type { Logger } from "pino";
import { z } from "zod";

import type { Database } from "../../lib/database/database.js";
import type { AiAgentService } from "../agent/agent.service.js";
import type { ChatEvent, ChatService } from "../chat/chat.service.js";
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
  const sender = asRecord(message.sender);
  return {
    chatId: firstString(
      recipient.chat_id,
      message.chat_id,
      payload.chat_id,
      payload.user_id,
    ),
    senderId: firstString(sender.user_id, sender.id, payload.user_id),
    text: firstString(body.text, message.text, payload.text),
    updateType: firstString(payload.update_type, payload.type),
  };
};
const detailsFor = (value: unknown) => asRecord(value);
const isMaxRequest = (value: unknown) => detailsFor(value).source === "MAX";
const isManagerMode = (value: unknown) =>
  detailsFor(value).chatMode === "manager";
const makePublicUrl = (
  url: string | undefined,
  siteUrl: string | undefined,
) => {
  if (!url) return undefined;
  if (/^https?:\/\//u.test(url)) return url;
  if (!siteUrl) return undefined;
  return new URL(url, siteUrl).toString();
};
const messageForMax = (
  event: Extract<ChatEvent, { type: "message" }>,
  siteUrl?: string,
) => {
  const link = makePublicUrl(event.bookingUrl, siteUrl);
  return link ? `${event.text}\n\nОткрыть: ${link}` : event.text;
};

export const createMaxBotRouter = ({
  agent,
  chat,
  database,
  logger,
  max,
  siteUrl,
  webhookSecret,
}: {
  readonly agent: AiAgentService;
  readonly chat: ChatService;
  readonly database: Database;
  readonly logger: Logger;
  readonly max: MaxBotClient;
  readonly siteUrl?: string;
  readonly webhookSecret?: string;
}): Router => {
  const router = Router();

  chat.subscribeAll((event) => {
    if (event.type !== "message" || event.author === "guest" || !max.configured)
      return;
    void database.client.adminRequest
      .findUnique({
        where: { id: event.conversationId },
        select: { details: true },
      })
      .then(async (request) => {
        const chatId = firstString(detailsFor(request?.details).maxChatId);
        if (!request || !isMaxRequest(request.details) || !chatId) return;
        await max.sendMessage({ chatId, text: messageForMax(event, siteUrl) });
      })
      .catch((error: unknown) =>
        logger.error(
          { error: error instanceof Error ? error.message : "Unknown error" },
          "MAX outgoing message delivery failed",
        ),
      );
  });

  router.get("/readiness", (_request, response) =>
    response.json({
      provider: "max",
      configured: max.configured,
      webhookProtectionConfigured: Boolean(webhookSecret),
      siteLinksConfigured: Boolean(siteUrl),
    }),
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
      if (!max.configured) {
        response.status(503).json({ error: "MAX bot is not configured." });
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
      const existing = await database.client.adminRequest.findUnique({
        where: { id: conversationId },
        select: { details: true },
      });
      const currentDetails = detailsFor(existing?.details);
      await database.client.adminRequest.upsert({
        where: { id: conversationId },
        create: {
          id: conversationId,
          category: "MAX",
          contact: `max:${senderId}`,
          description: text,
          details: { channelType: "chat", maxChatId: chatId, source: "MAX" },
          requester: `MAX ${senderId}`,
          status: "new",
          title: "Сообщение из MAX",
        },
        update: {
          contact: `max:${senderId}`,
          description: text,
          details: { ...currentDetails, maxChatId: chatId, source: "MAX" },
          updatedAt: new Date(),
        },
      });
      await chat.publish(conversationId, "guest", text);
      if (isManagerMode(currentDetails)) {
        response.sendStatus(200);
        return;
      }
      const result = await agent.reply(conversationId, text);
      if (result?.action === "transfer") {
        await database.client.adminRequest.update({
          where: { id: conversationId },
          data: {
            details: {
              ...currentDetails,
              chatMode: "manager",
              managerRequested: true,
              maxChatId: chatId,
              source: "MAX",
            },
          },
        });
      }
      if (!result)
        await chat.publish(
          conversationId,
          "agent",
          "Не удалось сформировать ответ автоматически. Попробуйте переформулировать вопрос — я попробую ещё раз.",
        );
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
