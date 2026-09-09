import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { Logger } from "pino";
import WebSocket, { WebSocketServer } from "ws";

import type { Database } from "../../lib/database/database.js";
import { formatEventsContext, listPublishedEvents } from "./events-context.js";
import { getVoiceInstructions } from "./voice-agent.prompt.js";
import { voiceAgentTools } from "./voice-agent.tools.js";

const realtimePath = "/api/voice-agent/realtime";
const realtimeModel = "gpt-realtime-2.1";

const transcriptEventTypes = new Set([
  "conversation.item.input_audio_transcription.completed",
  "conversation.item.input_audio_transcription.done",
  "response.audio_transcript.done",
]);

type GatewayError = {
  readonly code: string;
  readonly message: string;
  readonly requestId: string;
  readonly stage: string;
  readonly retryable: boolean;
};

const upstreamUrl = (baseUrl: string): string => {
  const url = new URL(`${baseUrl.replace(/\/$/u, "")}/realtime`);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.searchParams.set("model", realtimeModel);
  return url.toString();
};

const sendError = (socket: WebSocket, error: GatewayError): void => {
  if (socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify({ type: "amazi.gateway.error", error }));
  socket.close(1011, error.code);
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
          sendError(client, {
            code: "gateway_not_configured",
            message: "Голосовой AI-агент сейчас недоступен.",
            requestId: randomUUID(),
            stage: "configuration",
            retryable: false,
          });
          return;
        }

        const instructions = await getVoiceInstructions(options.database);
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

        upstream.on("message", async (data, isBinary) => {
          if (!isBinary) {
            try {
              const event = JSON.parse(data.toString()) as {
                type?: string;
                error?: { code?: string; message?: string };
              };
              if (event.type === "error") {
                const requestId = randomUUID();
                options.logger.error(
                  {
                    providerEvent: {
                      type: event.type,
                      code: event.error?.code,
                      message: event.error?.message,
                    },
                    requestId,
                    stage: "realtime_provider",
                  },
                  "Realtime provider returned an error",
                );
                sendError(client, {
                  code: event.error?.code ?? "provider_error",
                  message:
                    "Голосовой AI вернул ошибку. Повторите попытку позже.",
                  requestId,
                  stage: "realtime_provider",
                  retryable: false,
                });
                return;
              }
              if (transcriptEventTypes.has(event.type ?? "")) {
                // This browser websocket has no authenticated call identity.
                // Do not pretend these frames were persisted to a call: SIP
                // ingress is the only route currently correlated to VoiceCall.
                options.logger.warn(
                  { stage: "realtime_transcript", outcome: "not_persisted" },
                  "Realtime transcript received without a persistable call identity",
                );
              }
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
                      instructions,
                      output_modalities: ["audio"],
                      tools: voiceAgentTools,
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
              if (event.type === "response.function_call_arguments.done") {
                const functionEvent = event as typeof event & {
                  call_id?: string;
                  name?: string;
                  arguments?: string;
                };
                if (
                  functionEvent.call_id &&
                  functionEvent.name === "get_events"
                ) {
                  let output: unknown = {
                    available: false,
                    reason: "temporary_error",
                  };
                  try {
                    const args = JSON.parse(
                      functionEvent.arguments ?? "{}",
                    ) as { date?: string };
                    const found = await listPublishedEvents(
                      options.database,
                      args.date,
                    );
                    output = {
                      events: found,
                      context: formatEventsContext(found),
                    };
                  } catch {
                    // Return a safe tool result; the model will explain the failure and offer a transfer.
                  }
                  upstream.send(
                    JSON.stringify({
                      type: "conversation.item.create",
                      item: {
                        type: "function_call_output",
                        call_id: functionEvent.call_id,
                        output: JSON.stringify(output),
                      },
                    }),
                  );
                  upstream.send(JSON.stringify({ type: "response.create" }));
                }
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
          sendError(client, {
            code: "gateway_connection_failed",
            message: "Не удалось подключить голосовой AI-агент.",
            requestId: randomUUID(),
            stage: "realtime_connect",
            retryable: true,
          });
        });
      })().catch((error: unknown) => {
        options.logger.error(
          { error: error instanceof Error ? error.message : "Unknown error" },
          "Realtime session setup failed",
        );
        sendError(client, {
          code: "session_setup_failed",
          message: "Не удалось подготовить голосового AI-агента.",
          requestId: randomUUID(),
          stage: "session_setup",
          retryable: true,
        });
      });
    });
  });
};
