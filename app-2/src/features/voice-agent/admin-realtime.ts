import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { Logger } from "pino";
import WebSocket, { WebSocketServer } from "ws";

import type { Database } from "../../lib/database/database.js";
import { createAdminAuthRepository } from "../admin-auth/admin-auth.repository.js";
import { createAdminAuthService } from "../admin-auth/admin-auth.service.js";
import { getVoiceInstructions } from "./voice-agent.prompt.js";

const path = "/api/admin/voice-agent/realtime";
const model = "gpt-realtime-2.1";

const safeError = (socket: WebSocket, code: string, message: string) => {
  if (socket.readyState !== WebSocket.OPEN) return;
  socket.send(
    JSON.stringify({ type: "alsma.admin.realtime.error", code, message }),
  );
  socket.close(1011, code);
};

const gatewayUrl = (baseUrl: string) => {
  const url = new URL(`${baseUrl.replace(/\/$/u, "")}/realtime`);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.searchParams.set("model", model);
  return url.toString();
};

/** Authenticates the browser socket before opening the server-only Gateway connection. */
export const attachAdminRealtime = (
  server: Server,
  options: {
    apiKey?: string;
    baseUrl?: string;
    database: Database;
    logger: Logger;
  },
) => {
  const sockets = new WebSocketServer({
    noServer: true,
    maxPayload: 64 * 1024,
  });
  const auth = createAdminAuthService(
    createAdminAuthRepository(options.database),
  );
  server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url ?? "/", "http://localhost");
    if (url.pathname !== path) return;
    sockets.handleUpgrade(request, socket, head, (client) => {
      let upstream: WebSocket | undefined;
      let authenticated = false;
      let upstreamReady = false;
      const pendingMessages: string[] = [];
      let pendingResponseCreate: string | undefined;
      const closeUpstream = () => {
        if (upstream?.readyState === WebSocket.OPEN)
          upstream.close(1000, "client_closed");
      };
      client.on("close", closeUpstream);
      client.on("message", async (data, isBinary) => {
        if (isBinary) return;
        let event: { type?: string; token?: string };
        try {
          event = JSON.parse(data.toString()) as {
            type?: string;
            token?: string;
          };
        } catch {
          safeError(
            client,
            "invalid_message",
            "Не удалось обработать сообщение.",
          );
          return;
        }
        if (!authenticated) {
          if (event.type !== "auth" || !event.token) {
            safeError(
              client,
              "authentication_required",
              "Требуется вход администратора.",
            );
            return;
          }
          try {
            const user = await auth.me(event.token);
            if (
              !user.permissions.includes("*") &&
              !user.permissions.includes("voice.calls.access")
            ) {
              safeError(
                client,
                "permission_required",
                "У вас нет доступа к тесту голосового агента.",
              );
              return;
            }
            authenticated = true;
            if (!options.apiKey || !options.baseUrl) {
              safeError(
                client,
                "gateway_not_configured",
                "Голосовой AI-агент сейчас недоступен.",
              );
              return;
            }
            const instructions = await getVoiceInstructions(options.database);
            upstream = new WebSocket(gatewayUrl(options.baseUrl), {
              headers: { Authorization: `Bearer ${options.apiKey}` },
              maxPayload: 8 * 1024 * 1024,
            });
            upstream.on("open", () => {
              upstream?.send(
                JSON.stringify({
                  type: "session.update",
                  session: {
                    type: "realtime",
                    instructions,
                    output_modalities: ["text"],
                  },
                }),
              );
            });
            upstream.on("message", (providerData, providerBinary) => {
              if (!providerBinary) {
                try {
                  const providerEvent = JSON.parse(providerData.toString()) as {
                    type?: string;
                    error?: unknown;
                  };
                  if (providerEvent.type === "session.updated") {
                    upstreamReady = true;
                    pendingMessages
                      .splice(0)
                      .forEach((message) => upstream?.send(message));
                  }
                  if (
                    providerEvent.type === "conversation.item.done" &&
                    pendingResponseCreate
                  ) {
                    upstream?.send(pendingResponseCreate);
                    pendingResponseCreate = undefined;
                  }
                  if (providerEvent.type === "error") {
                    const requestId = randomUUID();
                    options.logger.error(
                      { requestId, providerEvent },
                      "Admin realtime provider error",
                    );
                    const providerCode =
                      typeof providerEvent.error === "object" &&
                      providerEvent.error !== null &&
                      "code" in providerEvent.error &&
                      typeof providerEvent.error.code === "string"
                        ? providerEvent.error.code
                        : "provider_error";
                    safeError(
                      client,
                      providerCode,
                      "Голосовой AI вернул ошибку. Повторите попытку позже.",
                    );
                    return;
                  }
                } catch {
                  options.logger.warn(
                    "Admin realtime provider returned a non-JSON frame",
                  );
                }
              }
              if (client.readyState === WebSocket.OPEN)
                client.send(providerData, { binary: providerBinary });
              if (!providerBinary) {
                try {
                  const providerEvent = JSON.parse(providerData.toString()) as {
                    type?: string;
                  };
                  if (providerEvent.type === "session.updated")
                    client.send(
                      JSON.stringify({
                        type: "alsma.admin.realtime.connected",
                        model,
                      }),
                    );
                } catch {
                  // The provider frame was already relayed unchanged.
                }
              }
            });
            upstream.on("close", (code, reason) => {
              if (client.readyState === WebSocket.OPEN)
                client.close(code || 1000, reason.toString().slice(0, 123));
            });
            upstream.on("error", (error) => {
              options.logger.error(
                { error: error.name },
                "Admin realtime upstream socket failed",
              );
              safeError(
                client,
                "gateway_connection_failed",
                "Не удалось подключить голосовой AI-агент.",
              );
            });
          } catch (error) {
            options.logger.warn(
              { error: error instanceof Error ? error.message : "unknown" },
              "Admin realtime authentication failed",
            );
            safeError(
              client,
              "authentication_failed",
              "Не удалось подтвердить доступ администратора.",
            );
          }
          return;
        }
        const serialized = data.toString();
        let clientEvent: { type?: string };
        try {
          clientEvent = JSON.parse(serialized) as { type?: string };
        } catch {
          safeError(
            client,
            "invalid_message",
            "Не удалось обработать сообщение.",
          );
          return;
        }
        if (clientEvent.type === "response.create") {
          pendingResponseCreate = serialized;
          return;
        }
        if (upstream?.readyState === WebSocket.OPEN && upstreamReady)
          upstream.send(serialized);
        else pendingMessages.push(serialized);
      });
    });
  });
};
