import { Router } from "express";
import { z } from "zod";

import type { Database } from "../../lib/database/database.js";
import { HttpError } from "../../lib/http/http-error.js";
import { validateRequest } from "../../lib/http/validate-request.js";
import {
  createRequireAdmin,
  createRequireAdminPermission,
} from "../admin-auth/admin-auth.middleware.js";
import { createAdminAuthRepository } from "../admin-auth/admin-auth.repository.js";
import { createAdminAuthService } from "../admin-auth/admin-auth.service.js";
import type { AiAgentService } from "../agent/agent.service.js";
import { createKnowledgeBaseRepository } from "../knowledge-base/knowledge-base.repository.js";
import { createKnowledgeBaseService } from "../knowledge-base/knowledge-base.service.js";
import type { ChatService } from "./chat.service.js";

const conversationSchema = z.object({
  conversationId: z.string().trim().min(1).max(100),
});
const guestMessageSchema = conversationSchema.extend({
  contact: z.string().trim().min(3).max(50),
  requester: z.string().trim().min(2).max(255),
  text: z.string().trim().min(1).max(2_000),
});
const managerMessageSchema = conversationSchema.extend({
  text: z.string().trim().min(1).max(2_000),
});
const modeSchema = conversationSchema.extend({
  mode: z.enum(["agent", "manager"]),
});
type ChatMode = z.infer<typeof modeSchema>["mode"];
const readDetails = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const readChatMode = (value: unknown): ChatMode =>
  readDetails(value).chatMode === "manager" ? "manager" : "agent";
const readManagerRequested = (value: unknown) =>
  readDetails(value).managerRequested === true;
const isSiteAgentActive = async (database: Database) => {
  const setting = await database.client.appSetting.findUnique({
    where: { key: "agent.settings" },
    select: { value: true },
  });
  const value = readDetails(setting?.value);
  return value.enabled !== false && value.site !== false;
};
const assertPublicConversation = async (
  database: Database,
  id: string,
  allowMissing = false,
) => {
  const request = await database.client.adminRequest.findUnique({
    where: { id },
    select: { details: true },
  });
  const details = readDetails(request?.details);
  if (!request && !allowMissing)
    throw new HttpError(404, "CHAT_NOT_FOUND", "Чат не найден.");
  // VK/MAX conversations are never exposed through the guest API. Their
  // history is available only through the authenticated admin chat routes.
  if (request && details.source !== "Сайт")
    throw new HttpError(
      403,
      "CHAT_ACCESS_DENIED",
      "Чат доступен только его владельцу.",
    );
  return request;
};
const writeEvent = (
  response: { write: (value: string) => void },
  payload: unknown,
) => response.write(`data: ${JSON.stringify(payload)}\n\n`);
const stream = (chat: ChatService, conversationId: string, response: any) => {
  response.setHeader("Content-Type", "text/event-stream");
  response.setHeader("Cache-Control", "no-cache");
  response.setHeader("Connection", "keep-alive");
  response.flushHeaders?.();
  writeEvent(response, { type: "ready" });
  const unsubscribe = chat.subscribe(conversationId, (message) =>
    writeEvent(response, message),
  );
  const heartbeat = setInterval(
    () => response.write(": heartbeat\n\n"),
    25_000,
  );
  response.on("close", () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
};

export const createChatRouter = (
  database: Database,
  chat: ChatService,
  agent: AiAgentService,
): Router => {
  const router = Router();
  const knowledge = createKnowledgeBaseService(
    createKnowledgeBaseRepository(database),
  );
  const getMode = async (conversationId: string): Promise<ChatMode> => {
    const request = await database.client.adminRequest.findUnique({
      where: { id: conversationId },
      select: { details: true },
    });
    return readChatMode(request?.details);
  };
  const setMode = async (
    conversationId: string,
    mode: ChatMode,
    managerRequested = false,
  ) => {
    const request = await database.client.adminRequest.findUnique({
      where: { id: conversationId },
      select: { details: true },
    });
    if (!request) return;
    await database.client.adminRequest.update({
      where: { id: conversationId },
      data: {
        details: {
          ...readDetails(request.details),
          chatMode: mode,
          managerRequested,
        },
      },
    });
  };
  router.get(
    "/mode",
    validateRequest({ query: conversationSchema }),
    async (_request, response) => {
      await assertPublicConversation(
        database,
        response.locals.input.query.conversationId,
      );
      return response.json({
        mode: await getMode(response.locals.input.query.conversationId),
        managerRequested: await database.client.adminRequest
          .findUnique({
            where: { id: response.locals.input.query.conversationId },
            select: { details: true },
          })
          .then((request) => readManagerRequested(request?.details)),
      });
    },
  );
  router.get(
    "/messages",
    validateRequest({ query: conversationSchema }),
    async (_request, response) => {
      await assertPublicConversation(
        database,
        response.locals.input.query.conversationId,
      );
      response.json({
        items: await chat.list(response.locals.input.query.conversationId),
      });
    },
  );
  router.post(
    "/messages",
    validateRequest({ body: guestMessageSchema }),
    async (_request, response) => {
      const input = response.locals.input.body;
      const existing = await assertPublicConversation(
        database,
        input.conversationId,
        true,
      );
      if (existing && readDetails(existing.details).source !== "Сайт")
        throw new HttpError(403, "CHAT_ACCESS_DENIED", "Чат недоступен.");
      await database.client.adminRequest.upsert({
        where: { id: input.conversationId },
        create: {
          id: input.conversationId,
          category: "Сайт",
          contact: input.contact,
          description: input.text,
          details: { channelType: "chat", source: "Сайт" },
          requester: input.requester,
          status: "new",
          title: "Новое сообщение с сайта",
        },
        update: {
          contact: input.contact,
          description: input.text,
          requester: input.requester,
          updatedAt: new Date(),
        },
      });
      const published = await chat.publish(
        input.conversationId,
        "guest",
        input.text,
      );
      if (!(await isSiteAgentActive(database))) {
        await setMode(input.conversationId, "manager", true);
        response.status(201).json({
          message: published,
          mode: "manager",
          managerRequested: true,
        });
        return;
      }
      if ((await getMode(input.conversationId)) === "manager") {
        response.status(201).json({ message: published });
        return;
      }
      chat.publishStatus(
        input.conversationId,
        "thinking",
        "Анализирую ваш запрос",
      );
      void agent
        .reply(input.conversationId, input.text)
        .then(async (result) => {
          if (!(await isSiteAgentActive(database))) {
            await setMode(input.conversationId, "manager", true);
            chat.publishStatus(input.conversationId, "idle", "");
            return;
          }
          if (result?.action === "transfer") {
            await setMode(input.conversationId, "manager", true);
            chat.publishStatus(input.conversationId, "idle", "");
            return;
          }
          if (!result) {
            let fallbackText =
              "Не удалось сформировать ответ автоматически. Попробуйте переформулировать вопрос — я попробую ещё раз.";
            try {
              const fallback = await knowledge.answer({
                channel: "text",
                question: input.text,
              });
              fallbackText = fallback.answer;
            } catch {
              // The fallback itself must never prevent a final chat message.
            }
            await chat.publish(input.conversationId, "agent", fallbackText);
          }
          chat.publishStatus(input.conversationId, "idle", "");
        })
        .catch(async () => {
          if (!(await isSiteAgentActive(database))) {
            await setMode(input.conversationId, "manager", true);
            chat.publishStatus(input.conversationId, "idle", "");
            return;
          }
          await chat.publish(
            input.conversationId,
            "agent",
            "Не удалось получить ответ автоматически. Попробуйте переформулировать вопрос — я попробую ещё раз.",
          );
          chat.publishStatus(input.conversationId, "idle", "");
        });
      response.status(201).json({ message: published });
    },
  );
  router.get(
    "/stream",
    validateRequest({ query: conversationSchema }),
    async (_request, response) => {
      await assertPublicConversation(
        database,
        response.locals.input.query.conversationId,
      );
      stream(chat, response.locals.input.query.conversationId, response);
    },
  );

  const admin = Router();
  admin.use(
    createRequireAdmin(
      createAdminAuthService(createAdminAuthRepository(database)),
    ),
  );
  admin.use(createRequireAdminPermission("requests.access"));
  admin.get(
    "/mode",
    validateRequest({ query: conversationSchema }),
    async (_request, response) => {
      const conversationId = response.locals.input.query.conversationId;
      const request = await database.client.adminRequest.findUnique({
        where: { id: conversationId },
        select: { details: true },
      });
      response.json({
        mode: readChatMode(request?.details),
        managerRequested: readManagerRequested(request?.details),
        agentStopped: !(await isSiteAgentActive(database)),
      });
    },
  );
  admin.get(
    "/messages",
    validateRequest({ query: conversationSchema }),
    async (_request, response) =>
      response.json({
        items: await chat.list(response.locals.input.query.conversationId),
      }),
  );
  admin.post(
    "/mode",
    validateRequest({ body: modeSchema }),
    async (_request, response) => {
      const input = response.locals.input.body;
      await setMode(input.conversationId, input.mode, false);
      response.json({ mode: input.mode });
    },
  );
  admin.post(
    "/messages",
    validateRequest({ body: managerMessageSchema }),
    async (_request, response) => {
      const input = response.locals.input.body;
      await setMode(input.conversationId, "manager", false);
      response.status(201).json({
        message: await chat.publish(
          input.conversationId,
          "manager",
          input.text,
        ),
      });
    },
  );
  admin.get("/stream", (request, response, next) => {
    const token =
      typeof request.query.token === "string" ? request.query.token : "";
    createAdminAuthService(createAdminAuthRepository(database))
      .me(token)
      .then(() => {
        const conversationId =
          typeof request.query.conversationId === "string"
            ? request.query.conversationId
            : "";
        if (!conversationSchema.safeParse({ conversationId }).success)
          throw new HttpError(
            400,
            "VALIDATION_ERROR",
            "Invalid conversation id.",
          );
        stream(chat, conversationId, response);
      })
      .catch(next);
  });
  router.use("/admin", admin);
  return router;
};
