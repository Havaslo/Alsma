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
  const conversationQueues = new Map<string, Promise<void>>();
  const deliveryQueues = new Map<string, Promise<void>>();
  const syntheticTestTexts = new Set([
    "Финальная проверка активного AI-чата",
    "Ответь коротко: AI активен",
    "Проверка VK 1",
    "Проверка VK 2",
    "Новое сообщение для AI",
    "Сообщение менеджеру",
    "Стабильное сообщение 1",
    "Стабильное сообщение 2",
    "Стабильное сообщение 3",
  ]);
  const isSyntheticTestMessage = (text: string, externalId: string) =>
    syntheticTestTexts.has(text) ||
    /vk:(?:ai-mode|manager-mode|history-queue)-/u.test(externalId);
  const deliverPending = async (conversationId: string, peerId: string) => {
    const pending = await database.client.chatMessage.findMany({
      where: {
        conversationId,
        author: { in: ["agent", "manager"] },
        externalId: null,
      },
      orderBy: { createdAt: "asc" },
      select: { id: true, text: true },
    });
    for (const message of pending) {
      let vkMessageId = "";
      let lastError: unknown;
      for (let attempt = 0; attempt < 3 && !vkMessageId; attempt += 1) {
        try {
          vkMessageId = await vk.sendMessage(peerId, message.text, message.id);
        } catch (error) {
          lastError = error;
          if (attempt < 2)
            await new Promise<void>((resolve) =>
              setTimeout(resolve, 500 * (attempt + 1)),
            );
        }
      }
      if (!vkMessageId) throw lastError ?? new Error("VK delivery failed");
      await database.client.chatMessage.update({
        where: { id: message.id },
        data: { externalId: `vk:${vkMessageId}` },
      });
    }
  };
  const enqueueDelivery = (conversationId: string, peerId: string) => {
    const previous = deliveryQueues.get(conversationId) ?? Promise.resolve();
    const current = previous
      .catch(() => undefined)
      .then(() => deliverPending(conversationId, peerId));
    deliveryQueues.set(conversationId, current);
    void current.finally(() => {
      if (deliveryQueues.get(conversationId) === current)
        deliveryQueues.delete(conversationId);
    });
    return current;
  };
  const importHistoryMessage = async (
    conversationId: string,
    item: {
      readonly id: string;
      readonly fromId: string;
      readonly text: string;
      readonly date: number;
    },
  ) => {
    const createdAt = new Date(item.date * 1_000);
    const localOutgoing = await database.client.chatMessage.findFirst({
      where: {
        conversationId,
        author: { in: ["agent", "manager"] },
        text: item.text,
        externalId: null,
        createdAt: {
          gte: new Date(createdAt.getTime() - 10 * 60_000),
          lte: new Date(createdAt.getTime() + 10 * 60_000),
        },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (localOutgoing) {
      await database.client.chatMessage.update({
        where: { id: localOutgoing.id },
        data: { externalId: `vk:${item.id}` },
      });
      return;
    }
    const author =
      item.fromId === `-${groupId}` || item.fromId === groupId
        ? "agent"
        : "guest";
    await chat.importMessage(
      conversationId,
      author,
      item.text,
      `vk:${item.id}`,
      createdAt,
    );
  };
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
        await enqueueDelivery(event.conversationId, peerId);
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
    // VK Callback API sends message_new payloads with the message fields
    // nested under object.message. Keep the flat fallback for compatible
    // payloads, but prefer the canonical nested message object.
    const message = record(object.message);
    const peerId = textOf(
      message.peer_id || object.peer_id || message.from_id || object.from_id,
    );
    const senderId = textOf(message.from_id || object.from_id);
    const text = textOf(message.text || object.text);
    const id = textOf(event.event_id);
    const messageId = textOf(
      message.conversation_message_id ||
        message.id ||
        object.conversation_message_id,
    );
    const externalId = messageId
      ? `vk:${messageId}`
      : id
        ? `vk:event:${id}`
        : "";
    // Only handle one-to-one messages from a user. Community-originated
    // message_new events and group conversations must not enter the agent
    // loop or be answered by the bot.
    if (
      !peerId ||
      !senderId ||
      !text ||
      senderId.startsWith("-") ||
      senderId === groupId ||
      peerId !== senderId
    )
      return;
    if (isSyntheticTestMessage(text, externalId)) return;
    if (id) {
      // VK can redeliver an event after a timeout, and an earlier attempt may
      // have failed after the durable webhook marker was created.  A unique
      // insert alone incorrectly treats every redelivery as a duplicate and
      // permanently drops failed messages.  Only a completed marker is a
      // terminal state; processing/failed markers must be claimable again.
      const existingUpdate = await database.client.vkWebhookUpdate.findUnique({
        where: { id },
        select: { groupId: true, status: true },
      });
      if (existingUpdate?.groupId !== undefined) {
        if (existingUpdate.groupId !== groupId) return;
        if (existingUpdate.status === "completed") return;
        await database.client.vkWebhookUpdate.update({
          where: { id },
          data: { status: "processing", updatedAt: new Date() },
        });
      } else {
        try {
          await database.client.vkWebhookUpdate.create({
            data: {
              id,
              groupId: groupId!,
              payload: JSON.parse(JSON.stringify(event)),
              status: "processing",
            },
          });
        } catch {
          // A concurrent delivery may have created the marker. It is safe to
          // continue: the message-level externalId check below is the final
          // idempotency guard before the agent is invoked.
        }
      }
    }
    const previous = conversationQueues.get(peerId) ?? Promise.resolve();
    let release!: () => void;
    const turn = new Promise<void>((resolve) => {
      release = resolve;
    });
    const queued = previous.then(() => turn);
    conversationQueues.set(peerId, queued);
    await previous;
    try {
      const conversationId = conversationIdFor(peerId);
      const existing = await database.client.adminRequest.findUnique({
        where: { id: conversationId },
        select: { details: true },
      });
      const details = record(existing?.details);
      let incomingMessageStored = false;
      if (externalId) {
        const alreadyStored = await database.client.chatMessage.findUnique({
          where: {
            conversationId_externalId: { conversationId, externalId },
          },
          select: { id: true },
        });
        // A full VK history sync may have imported the current event before
        // the callback reaches this point. That must suppress only the
        // duplicate INSERT, not the agent turn for this callback.
        incomingMessageStored = Boolean(alreadyStored);
      }
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
      // `vkHistorySynced` was set by the old importer, which could leave
      // locally-created outgoing messages and VK history as duplicates. Run
      // one reconciliation pass for those conversations before switching to
      // the cheaper recent-history refresh.
      if (details.vkHistoryReconciled !== true) {
        try {
          const history = await vk.getHistory(peerId, true);
          for (const item of history) {
            if (isSyntheticTestMessage(item.text, `vk:${item.id}`)) continue;
            await importHistoryMessage(conversationId, item);
          }
          await database.client.adminRequest.update({
            where: { id: conversationId },
            data: {
              details: {
                ...details,
                vkHistoryReconciled: true,
                vkHistorySynced: true,
              },
            },
          });
        } catch (error) {
          logger.warn(
            { error: error instanceof Error ? error.message : "Unknown error" },
            "VK history synchronization failed",
          );
        }
      } else {
        const recentHistory = await vk.getHistory(peerId).catch(() => []);
        for (const item of recentHistory) {
          if (isSyntheticTestMessage(item.text, `vk:${item.id}`)) continue;
          await importHistoryMessage(conversationId, item);
        }
      }
      if (!incomingMessageStored)
        await chat.publish(
          conversationId,
          "guest",
          text,
          undefined,
          externalId || undefined,
        );
      const managerMode = details.chatMode === "manager";
      if (!managerMode) {
        const result = await agent.reply(conversationId, text);
        if (result?.action === "transfer") {
          await database.client.adminRequest.update({
            where: { id: conversationId },
            data: {
              details: {
                ...details,
                chatMode: "manager",
                managerRequested: true,
                source: "VK",
                vkPeerId: peerId,
                vkUserId: senderId,
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
      }
      await enqueueDelivery(conversationId, peerId);
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
    } finally {
      release();
      if (conversationQueues.get(peerId) === queued)
        conversationQueues.delete(peerId);
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
  router.get("/callback", (_request, response) => {
    response.type("text/plain").send("VK callback endpoint is ready");
  });
  router.post("/callback", (request, response) => {
    const parsed = schema.safeParse(request.body);
    if (
      !parsed.success ||
      !groupId ||
      textOf(parsed.data.group_id) !== groupId
    ) {
      response.status(400).type("text/plain").send("bad request");
      return;
    }
    if (parsed.data.type === "confirmation") {
      if (!confirmationCode) {
        response
          .status(503)
          .type("text/plain")
          .send("confirmation is not configured");
        return;
      }
      // VK compares the confirmation body byte-for-byte. Explicitly use a
      // plain-text response so preview HTML decoration is not triggered.
      response.status(200).type("text/plain").send(confirmationCode);
      return;
    }
    if (
      !callbackSecret ||
      !secretMatches(textOf(parsed.data.secret), callbackSecret)
    ) {
      // VK retries callback deliveries when it receives 401. A rejected
      // event must never be enqueued, but a plain 200 prevents VK from
      // turning a stale/misconfigured subscription into a retry storm. The
      // secret check remains mandatory for processing.
      response.status(200).type("text/plain").send("ok");
      return;
    }
    response.status(200).type("text/plain").send("ok");
    void processEvent(parsed.data);
  });
  return router;
};
