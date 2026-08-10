import { Router } from "express";
import { z } from "zod";

import type { Database } from "../../lib/database/database.js";
import { HttpError } from "../../lib/http/http-error.js";
import { validateRequest } from "../../lib/http/validate-request.js";
import { createRequireAdmin } from "../admin-auth/admin-auth.middleware.js";
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
  router.get(
    "/messages",
    validateRequest({ query: conversationSchema }),
    (_request, response) =>
      response.json({
        items: chat.list(response.locals.input.query.conversationId),
      }),
  );
  router.post(
    "/messages",
    validateRequest({ body: guestMessageSchema }),
    async (_request, response) => {
      const input = response.locals.input.body;
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
      const published = chat.publish(input.conversationId, "guest", input.text);
      void agent
        .reply(input.conversationId, input.text)
        .then(async (result) => {
          if (!result) {
            const fallback = await knowledge.answer({
              channel: "text",
              question: input.text,
            });
            chat.publish(input.conversationId, "manager", fallback.answer);
          }
        })
        .catch(() => undefined);
      response.status(201).json({ message: published });
    },
  );
  router.get(
    "/stream",
    validateRequest({ query: conversationSchema }),
    (_request, response) =>
      stream(chat, response.locals.input.query.conversationId, response),
  );

  const admin = Router();
  admin.use(
    createRequireAdmin(
      createAdminAuthService(createAdminAuthRepository(database)),
    ),
  );
  admin.get("/messages", (_request, response) =>
    response.json({ items: chat.list() }),
  );
  admin.post(
    "/messages",
    validateRequest({ body: managerMessageSchema }),
    (_request, response) => {
      const input = response.locals.input.body;
      response.status(201).json({
        message: chat.publish(input.conversationId, "manager", input.text),
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
