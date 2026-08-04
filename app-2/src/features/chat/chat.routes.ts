import { Router } from "express";
import { z } from "zod";

import type { Database } from "../../lib/database/database.js";
import { HttpError } from "../../lib/http/http-error.js";
import { validateRequest } from "../../lib/http/validate-request.js";
import { createRequireAdmin } from "../admin-auth/admin-auth.middleware.js";
import { createAdminAuthRepository } from "../admin-auth/admin-auth.repository.js";
import { createAdminAuthService } from "../admin-auth/admin-auth.service.js";
import type { ChatService } from "./chat.service.js";

const conversationSchema = z.object({ conversationId: z.string().uuid() });
const messageSchema = conversationSchema.extend({
  text: z.string().trim().min(1).max(2_000),
});

const writeEvent = (
  response: { write: (value: string) => void },
  payload: unknown,
) => {
  response.write(`data: ${JSON.stringify(payload)}\n\n`);
};

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
): Router => {
  const router = Router();
  router.get(
    "/messages",
    validateRequest({ query: conversationSchema }),
    (request, response) => {
      response.json({
        items: chat.list(response.locals.input.query.conversationId),
      });
    },
  );
  router.post(
    "/messages",
    validateRequest({ body: messageSchema }),
    (request, response) => {
      const input = response.locals.input.body;
      response.status(201).json({
        message: chat.publish(input.conversationId, "guest", input.text),
      });
    },
  );
  router.get(
    "/stream",
    validateRequest({ query: conversationSchema }),
    (request, response) => {
      stream(chat, response.locals.input.query.conversationId, response);
    },
  );

  const requireAdmin = createRequireAdmin(
    createAdminAuthService(createAdminAuthRepository(database)),
  );
  const admin = Router();
  admin.use(requireAdmin);
  admin.get("/messages", (_request, response) =>
    response.json({ items: chat.list() }),
  );
  admin.post(
    "/messages",
    validateRequest({ body: messageSchema }),
    (request, response) => {
      const input = response.locals.input.body;
      response.status(201).json({
        message: chat.publish(input.conversationId, "manager", input.text),
      });
    },
  );
  admin.get("/stream", (request, response, next) => {
    const token =
      typeof request.query.token === "string" ? request.query.token : "";
    const service = createAdminAuthService(createAdminAuthRepository(database));
    service
      .me(token)
      .then(() => {
        const conversationId =
          typeof request.query.conversationId === "string"
            ? request.query.conversationId
            : "";
        if (!z.string().uuid().safeParse(conversationId).success)
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
