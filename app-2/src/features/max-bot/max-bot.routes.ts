import { Router } from "express";
import { createHash, timingSafeEqual } from "node:crypto";
import type { Logger } from "pino";
import { z } from "zod";

import type { Database } from "../../lib/database/database.js";
import type { AiAgentService } from "../agent/agent.service.js";
import type { ChatEvent, ChatService } from "../chat/chat.service.js";
import { MaxApiError, type MaxBotClient } from "./max-bot.client.js";

const updateSchema = z.record(z.string(), z.unknown());
const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const firstString = (...values: unknown[]) =>
  values
    .find(
      (value): value is string | number =>
        (typeof value === "string" && Boolean(value.trim())) ||
        typeof value === "number",
    )
    ?.toString()
    .trim();
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
    chatId: firstString(recipient.chat_id, message.chat_id, payload.chat_id),
    eventId: firstString(
      payload.update_id,
      payload.id,
      message.id,
      message.mid,
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
const secureEqual = (received: string | undefined, expected: string) => {
  if (!received) return false;
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
};
const makePublicUrl = (
  url: string | undefined,
  siteUrl: string | undefined,
) => {
  if (!url) return undefined;
  if (/^https?:\/\//u.test(url)) return url;
  return siteUrl ? new URL(url, siteUrl).toString() : undefined;
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
  webhookUrl,
}: {
  readonly agent: AiAgentService;
  readonly chat: ChatService;
  readonly database: Database;
  readonly logger: Logger;
  readonly max: MaxBotClient;
  readonly siteUrl?: string;
  readonly webhookSecret?: string;
  readonly webhookUrl?: string;
}): Router => {
  const router = Router();
  const conversationQueues = new Map<string, Promise<void>>();
  if (max.configured && webhookSecret && webhookUrl) {
    const callbackUrl = new URL("/api/max/webhook", webhookUrl).toString();
    void max
      .registerWebhook({ secret: webhookSecret, url: callbackUrl })
      .catch((error: unknown) =>
        logger.error(
          { error: error instanceof Error ? error.message : "Unknown error" },
          "MAX webhook subscription registration failed",
        ),
      );
  }
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

  const handleUpdate = async (payload: Record<string, unknown>) => {
    const { chatId, eventId, senderId, text, updateType } =
      extractMessage(payload);
    if (updateType && updateType !== "message_created") {
      logger.info(
        { channel: "MAX", reason: "unsupported_update", updateType },
        "MAX message skipped",
      );
      return;
    }
    if (!chatId || !text || !senderId) {
      logger.info(
        { channel: "MAX", reason: "missing_message_fields", chatId },
        "MAX message skipped",
      );
      return;
    }
    let bot;
    try {
      bot = await max.getBotIdentity();
    } catch (error) {
      logger.warn(
        {
          channel: "MAX",
          chatId,
          reason: "bot_identity_unavailable",
          error: error instanceof Error ? error.message : "Unknown error",
        },
        "MAX message skipped",
      );
      return;
    }
    if (!bot) {
      logger.warn(
        { channel: "MAX", chatId, reason: "bot_identity_missing" },
        "MAX message skipped",
      );
      return;
    }
    if (bot?.userId === senderId) {
      logger.info(
        {
          channel: "MAX",
          chatId,
          conversationId: conversationIdFor(chatId),
          reason: "bot_sender",
        },
        "MAX message skipped",
      );
      return;
    }
    if (eventId) {
      try {
        await database.client.maxWebhookUpdate.create({
          data: { id: eventId },
        });
      } catch {
        return;
      }
    }
    const previous = conversationQueues.get(chatId) ?? Promise.resolve();
    let release!: () => void;
    const turn = new Promise<void>((resolve) => {
      release = resolve;
    });
    const queued = previous.then(() => turn);
    conversationQueues.set(chatId, queued);
    await previous;
    try {
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
        },
      });
      await chat.publish(conversationId, "guest", text);
      if (!isManagerMode(currentDetails)) {
        const result = await agent.reply(conversationId, text);
        if (result?.action === "transfer")
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
        if (!result)
          await chat.publish(
            conversationId,
            "agent",
            "Не удалось сформировать ответ автоматически. Попробуйте переформулировать вопрос — я попробую ещё раз.",
          );
      }
      if (eventId)
        await database.client.maxWebhookUpdate.update({
          where: { id: eventId },
          data: { status: "completed" },
        });
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : "Unknown error" },
        "MAX webhook processing failed",
      );
      if (eventId)
        await database.client.maxWebhookUpdate
          .update({ where: { id: eventId }, data: { status: "failed" } })
          .catch(() => undefined);
    } finally {
      release();
      if (conversationQueues.get(chatId) === queued)
        conversationQueues.delete(chatId);
    }
  };

  router.get("/readiness", async (_request, response) => {
    let credentialsVerified = false;
    let credentialsStatus: number | null = null;
    let credentialsError: string | null = null;
    let credentialsNetworkCode: string | null = null;
    if (max.configured) {
      try {
        await max.verifyCredentials();
        credentialsVerified = true;
      } catch (error) {
        credentialsStatus = error instanceof MaxApiError ? error.status : null;
        credentialsError =
          error instanceof MaxApiError
            ? "http"
            : error instanceof TypeError
              ? "network"
              : "unknown";
        const cause = error instanceof Error ? error.cause : undefined;
        if (
          cause &&
          typeof cause === "object" &&
          "code" in cause &&
          typeof cause.code === "string"
        )
          credentialsNetworkCode = cause.code;
        // The response intentionally exposes configuration state only.
      }
    }
    response.json({
      provider: "max",
      configured: max.configured,
      credentialsVerified,
      credentialsStatus,
      credentialsError,
      credentialsNetworkCode,
      webhookProtectionConfigured: Boolean(webhookSecret),
      webhookUrlConfigured: Boolean(webhookUrl),
      siteLinksConfigured: Boolean(siteUrl),
    });
  });
  router.post("/webhook", (request, response) => {
    if (
      !webhookSecret ||
      !secureEqual(request.header("x-max-bot-api-secret"), webhookSecret)
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
    response.sendStatus(200);
    void handleUpdate(parsed.data);
  });
  return router;
};
