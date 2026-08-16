import { Router } from "express";
import { createHash, timingSafeEqual } from "node:crypto";
import type { Logger } from "pino";
import { z } from "zod";

import type { Database } from "../../lib/database/database.js";
import type { AiAgentService } from "../agent/agent.service.js";
import type { ChatService } from "../chat/chat.service.js";
import type { VkClient } from "./vk.client.js";

const schema = z.record(z.string(), z.unknown());
const record = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
const textOf = (v: unknown) =>
  typeof v === "string" || typeof v === "number" ? String(v).trim() : "";
const conversationIdFor = (peerId: string) => {
  const digest = createHash("md5").update(`vk:${peerId}`).digest();
  digest[6] = (digest[6]! & 15) | 48;
  digest[8] = (digest[8]! & 63) | 128;
  const hex = digest.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};
const secretMatches = (received: string, expected: string) => {
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
};

export const createVkRouter = ({
  agent,
  chat,
  database,
  groupId,
  callbackSecret,
  confirmationCode,
  logger,
  vk,
}: {
  readonly agent: AiAgentService;
  readonly chat: ChatService;
  readonly database: Database;
  readonly groupId?: string;
  readonly callbackSecret?: string;
  readonly confirmationCode?: string;
  readonly logger: Logger;
  readonly vk: VkClient;
}): Router => {
  const router = Router();
  chat.subscribeAll((event) => {
    if (
      event.type !== "message" ||
      event.author === "guest" ||
      !vk.configured ||
      !groupId
    )
      return;
    void database.client.adminRequest
      .findUnique({
        where: { id: event.conversationId },
        select: { details: true },
      })
      .then(async (request) => {
        const details = record(request?.details);
        const peerId = textOf(details.vkPeerId);
        if (!request || details.source !== "VK" || !peerId) return;
        await vk.sendMessage(peerId, event.text, event.id);
      })
      .catch((error: unknown) =>
        logger.error(
          { error: error instanceof Error ? error.message : "Unknown error" },
          "VK outgoing message delivery failed",
        ),
      );
  });
  const processEvent = async (event: Record<string, unknown>) => {
    if (event.type !== "message_new" || textOf(event.group_id) !== groupId)
      return;
    const object = record(event.object);
    const peerId = textOf(object.peer_id || object.from_id);
    const senderId = textOf(object.from_id);
    const text = textOf(object.text);
    const id = textOf(event.event_id);
    if (!peerId || !senderId || !text) return;
    if (id) {
      try {
        await database.client.vkWebhookUpdate.create({
          data: { id, groupId: groupId! },
        });
      } catch {
        return;
      }
    }
    try {
      const conversationId = conversationIdFor(peerId);
      const existing = await database.client.adminRequest.findUnique({
        where: { id: conversationId },
        select: { details: true },
      });
      const details = record(existing?.details);
      await database.client.adminRequest.upsert({
        where: { id: conversationId },
        create: {
          id: conversationId,
          category: "VK",
          contact: `vk:${senderId}`,
          description: text,
          details: {
            channelType: "chat",
            source: "VK",
            vkPeerId: peerId,
            vkUserId: senderId,
          },
          requester: `VK ${senderId}`,
          status: "new",
          title: "Сообщение из VK",
        },
        update: {
          contact: `vk:${senderId}`,
          description: text,
          details: {
            ...details,
            source: "VK",
            vkPeerId: peerId,
            vkUserId: senderId,
          },
        },
      });
      await chat.publish(conversationId, "guest", text);
      const result = await agent.reply(conversationId, text);
      if (!result)
        await chat.publish(
          conversationId,
          "agent",
          "Не удалось сформировать ответ автоматически. Попробуйте переформулировать вопрос — я попробую ещё раз.",
        );
      if (id)
        await database.client.vkWebhookUpdate.update({
          where: { id },
          data: { status: "completed" },
        });
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : "Unknown error" },
        "VK webhook processing failed",
      );
      if (id)
        await database.client.vkWebhookUpdate
          .update({ where: { id }, data: { status: "failed" } })
          .catch(() => undefined);
    }
  };
  router.get("/readiness", async (_request, response) => {
    let credentialsVerified = false;
    if (vk.configured && groupId) {
      try {
        await vk.verifyCredentials(groupId);
        credentialsVerified = true;
      } catch {
        /* status only */
      }
    }
    response.json({
      provider: "vk",
      configured: vk.configured && Boolean(groupId),
      credentialsVerified,
      callbackProtectionConfigured: Boolean(callbackSecret),
      confirmationConfigured: Boolean(confirmationCode),
    });
  });
  router.post("/callback", (request, response) => {
    const parsed = schema.safeParse(request.body);
    if (
      !parsed.success ||
      !groupId ||
      textOf(parsed.data.group_id) !== groupId
    ) {
      response.status(400).send("bad request");
      return;
    }
    if (parsed.data.type === "confirmation") {
      if (!confirmationCode) {
        response.status(503).send("confirmation is not configured");
        return;
      }
      response.send(confirmationCode);
      return;
    }
    if (
      !callbackSecret ||
      !secretMatches(textOf(parsed.data.secret), callbackSecret)
    ) {
      response.status(401).send("unauthorized");
      return;
    }
    response.send("ok");
    void processEvent(parsed.data);
  });
  return router;
};
