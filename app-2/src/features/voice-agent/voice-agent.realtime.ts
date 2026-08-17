import type { Server } from "node:http";
import type { Logger } from "pino";
import WebSocket, { WebSocketServer } from "ws";

import type { Database } from "../../lib/database/database.js";
import { createVoiceAgentRepository } from "./voice-agent.repository.js";
import {
  recordingDisclosure,
  voiceAgentSystemPrompt,
} from "./voice-agent.service.js";

const realtimePath = "/api/voice-agent/realtime";
const realtimeModel = "gpt-realtime";

const upstreamUrl = (baseUrl: string): string => {
  const url = new URL(`${baseUrl.replace(/\/$/u, "")}/realtime`);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.searchParams.set("model", realtimeModel);
  return url.toString();
};

const sendError = (socket: WebSocket, code: string, message: string): void => {
  if (socket.readyState !== WebSocket.OPEN) return;
  socket.send(
    JSON.stringify({ error: { code, message }, type: "alsma.realtime.error" }),
  );
  socket.close(1011, code);
};

export const attachVoiceAgentRealtime = (
  server: Server,
  options: {
    readonly apiKey?: string;
    readonly database: Database;
    readonly logger: Logger;
    readonly openaiBaseUrl?: string;
  },
): void => {
  const websocketServer = new WebSocketServer({
    maxPayload: 8 * 1024 * 1024,
    noServer: true,
  });

  server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url ?? "/", "http://localhost");
    if (url.pathname !== realtimePath) return;
    websocketServer.handleUpgrade(request, socket, head, (client) => {
      void (async () => {
        if (!options.apiKey || !options.openaiBaseUrl) {
          sendError(
            client,
            "gateway_not_configured",
            "Голосовой AI-агент сейчас недоступен.",
          );
          return;
        }

        const knowledge = await createVoiceAgentRepository(
          options.database,
        ).getKnowledgeContext();
        const upstream = new WebSocket(upstreamUrl(options.openaiBaseUrl), {
          headers: { Authorization: `Bearer ${options.apiKey}` },
          maxPayload: 8 * 1024 * 1024,
        });

        client.on("message", (data, isBinary) => {
          if (upstream.readyState === WebSocket.OPEN)
            upstream.send(data, { binary: isBinary });
        });
        client.on("close", () => {
          if (upstream.readyState === WebSocket.OPEN)
            upstream.close(1000, "client_closed");
        });
        client.on("error", (error) => {
          options.logger.warn(
            { error: error.name },
            "Realtime client socket failed",
          );
        });

        upstream.on("message", (data, isBinary) => {
          if (!isBinary) {
            try {
              const event = JSON.parse(data.toString()) as { type?: string };
              if (event.type === "session.created") {
                upstream.send(
                  JSON.stringify({
                    session: {
                      audio: {
                        input: {
                          turn_detection: {
                            create_response: true,
                            interrupt_response: true,
                            type: "server_vad",
                          },
                        },
                        output: { voice: "marin" },
                      },
                      instructions: `${voiceAgentSystemPrompt}\n\nПервой фразой сообщи: ${recordingDisclosure}\n\nБаза знаний и правила:\n${knowledge}`,
                      output_modalities: ["audio"],
                      type: "realtime",
                    },
                    type: "session.update",
                  }),
                );
                client.send(
                  JSON.stringify({
                    model: realtimeModel,
                    type: "alsma.realtime.connected",
                  }),
                );
              }
            } catch {
              options.logger.warn(
                "Realtime provider returned a non-JSON text frame",
              );
            }
          }
          if (client.readyState === WebSocket.OPEN)
            client.send(data, { binary: isBinary });
        });
        upstream.on("close", (code, reason) => {
          if (client.readyState === WebSocket.OPEN)
            client.close(code || 1000, reason.toString().slice(0, 123));
        });
        upstream.on("error", (error) => {
          options.logger.error(
            { error: error.name },
            "Realtime upstream socket failed",
          );
          sendError(
            client,
            "gateway_connection_failed",
            "Не удалось подключить голосового AI-агента.",
          );
        });
      })().catch((error: unknown) => {
        options.logger.error(
          { error: error instanceof Error ? error.message : "Unknown error" },
          "Realtime session setup failed",
        );
        sendError(
          client,
          "session_setup_failed",
          "Не удалось подготовить голосового AI-агента.",
        );
      });
    });
  });
};
