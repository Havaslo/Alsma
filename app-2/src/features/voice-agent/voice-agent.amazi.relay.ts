import type { Logger } from "pino";
import WebSocket from "ws";

import { createLogger } from "../../lib/logger.js";
import type { VoiceAgentService } from "./voice-agent.service.js";

type RelayEvent = {
  readonly type?: string;
  readonly event_id?: string;
  readonly call_id?: string;
  readonly name?: string;
  readonly arguments?: string;
  readonly transcript?: string;
  readonly item_id?: string;
};

type RelaySocket = WebSocket;
type RelaySocketConstructor = new (
  url: string,
  options?: WebSocket.ClientOptions,
) => RelaySocket;

type AmaziRelayOptions = {
  readonly logger?: Logger;
  readonly service: Pick<
    VoiceAgentService,
    "appendTranscriptByProvider" | "toolForProviderCall"
  >;
  readonly authorizationToken?: string;
  readonly WebSocketClass?: RelaySocketConstructor;
};

type RelaySession = {
  readonly eventRelayUrl: string;
  readonly sessionId: string;
  readonly providerCallId: string;
  readonly toolCallIds: Set<string>;
  socket: RelaySocket;
  reconnectAttempts: number;
  reconnectTimer?: NodeJS.Timeout;
  closing: boolean;
  retryDisabled: boolean;
};

const relayRetryDelays = [250, 500, 1_000, 2_000] as const;

const transcriptEventTypes = new Set([
  "conversation.item.input_audio_transcription.completed",
  "conversation.item.input_audio_transcription.done",
  "response.audio_transcript.done",
]);

const parseRelayEvent = (data: WebSocket.RawData): RelayEvent | undefined => {
  try {
    const value: unknown = JSON.parse(data.toString());
    return value && typeof value === "object"
      ? (value as RelayEvent)
      : undefined;
  } catch {
    return undefined;
  }
};

const transcriptRole = (type: string): "guest" | "assistant" =>
  type.startsWith("response.") ? "assistant" : "guest";

export const createAmaziEventRelay = ({
  logger = createLogger(),
  service,
  authorizationToken,
  WebSocketClass = WebSocket,
}: AmaziRelayOptions) => {
  const sessions = new Map<string, RelaySession>();

  const sendToolOutput = (
    session: RelaySession,
    callId: string,
    result: unknown,
  ) => {
    if (
      session.retryDisabled ||
      session.socket.readyState !== WebSocket.OPEN ||
      sessions.get(session.sessionId) !== session
    )
      return;
    session.socket.send(
      JSON.stringify({
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: callId,
          output: JSON.stringify(result),
        },
      }),
    );
    session.socket.send(JSON.stringify({ type: "response.create" }));
  };

  const handleToolCall = async (
    session: RelaySession,
    event: RelayEvent,
  ): Promise<void> => {
    if (!event.call_id || !event.name || session.toolCallIds.has(event.call_id))
      return;
    session.toolCallIds.add(event.call_id);
    let args: unknown = {};
    try {
      args = JSON.parse(event.arguments ?? "{}");
    } catch {
      args = {};
    }
    const result = await service.toolForProviderCall(
      session.providerCallId,
      event.name,
      args,
    );
    sendToolOutput(session, event.call_id, result);
  };

  const scheduleReconnect = (
    session: RelaySession,
    stage: "unexpected_response" | "socket_close",
    statusCode?: number,
  ) => {
    if (
      session.closing ||
      session.retryDisabled ||
      session.reconnectTimer ||
      session.reconnectAttempts >= relayRetryDelays.length
    )
      return;
    const delay = relayRetryDelays[session.reconnectAttempts];
    session.reconnectAttempts += 1;
    logger.warn(
      {
        ...(statusCode === undefined ? {} : { statusCode }),
        attempt: session.reconnectAttempts,
        stage,
      },
      "Amazi event relay reconnect scheduled",
    );
    session.reconnectTimer = setTimeout(() => {
      session.reconnectTimer = undefined;
      if (sessions.get(session.sessionId) !== session || session.closing)
        return;
      openSocket(session);
    }, delay);
  };

  const wire = (session: RelaySession, socket: RelaySocket) => {
    socket.on("message", (data, isBinary) => {
      if (
        sessions.get(session.sessionId) !== session ||
        session.socket !== socket ||
        session.retryDisabled
      )
        return;
      if (isBinary) return;
      const event = parseRelayEvent(data);
      if (!event?.type) return;
      if (transcriptEventTypes.has(event.type) && event.transcript?.trim()) {
        const providerEventId =
          event.event_id ??
          event.item_id ??
          `${event.type}:${event.transcript}`;
        void service
          .appendTranscriptByProvider(session.providerCallId, {
            providerEventId: providerEventId.slice(0, 200),
            role: transcriptRole(event.type),
            text: event.transcript.trim().slice(0, 10_000),
          })
          .catch((error: unknown) => {
            logger.warn(
              {
                error: error instanceof Error ? error.message : "unknown",
                stage: "amazi_relay_transcript",
              },
              "Amazi relay transcript persistence failed",
            );
          });
      }
      if (event.type === "response.function_call_arguments.done")
        void handleToolCall(session, event).catch((error: unknown) => {
          logger.warn(
            {
              error: error instanceof Error ? error.message : "unknown",
              stage: "amazi_relay_tool",
            },
            "Amazi relay tool execution failed",
          );
          if (event.call_id)
            sendToolOutput(session, event.call_id, {
              accepted: false,
              reason: "tool_failed",
            });
        });
    });
    socket.on("error", (error) => {
      logger.warn(
        {
          error: error.name,
          stage: "amazi_relay_socket",
        },
        "Amazi event relay socket failed",
      );
    });
    socket.on("unexpected-response", (request, response) => {
      if (
        sessions.get(session.sessionId) !== session ||
        session.socket !== socket
      )
        return;
      const statusCode = response.statusCode;
      if (statusCode === 401) {
        session.retryDisabled = true;
        logger.error(
          { stage: "amazi_relay_authentication", statusCode },
          "Amazi event relay authentication failed",
        );
        response.resume?.();
        request.destroy?.();
        return;
      }
      if (statusCode === 404) {
        scheduleReconnect(session, "unexpected_response", statusCode);
        response.resume?.();
        request.destroy?.();
        return;
      }
      scheduleReconnect(session, "unexpected_response", statusCode);
      response.resume?.();
      request.destroy?.();
    });
    socket.on("close", () => {
      if (
        sessions.get(session.sessionId) !== session ||
        session.socket !== socket
      )
        return;
      if (session.closing || session.retryDisabled) {
        sessions.delete(session.sessionId);
        return;
      }
      scheduleReconnect(session, "socket_close");
      if (
        !session.reconnectTimer &&
        session.reconnectAttempts >= relayRetryDelays.length
      ) {
        sessions.delete(session.sessionId);
        logger.error(
          { stage: "amazi_relay_reconnect_exhausted" },
          "Amazi event relay reconnect attempts exhausted",
        );
      }
    });
  };

  const openSocket = (session: RelaySession): void => {
    if (session.closing || session.retryDisabled) return;
    try {
      const socket = new WebSocketClass(
        session.eventRelayUrl,
        authorizationToken
          ? { headers: { Authorization: `Bearer ${authorizationToken}` } }
          : undefined,
      );
      session.socket = socket;
      wire(session, socket);
    } catch (error) {
      logger.warn(
        {
          error: error instanceof Error ? error.name : "unknown",
          stage: "amazi_relay_socket_create",
        },
        "Amazi event relay socket creation failed",
      );
      scheduleReconnect(session, "socket_close");
    }
  };

  const connect = (
    sessionId: string,
    providerCallId: string,
    eventRelayUrl: string,
  ): void => {
    if (sessions.has(sessionId)) return;
    const session = {
      eventRelayUrl,
      providerCallId,
      reconnectAttempts: 0,
      sessionId,
      socket: undefined as unknown as RelaySocket,
      toolCallIds: new Set<string>(),
      closing: false,
      retryDisabled: false,
    } satisfies RelaySession;
    sessions.set(sessionId, session);
    openSocket(session);
  };

  return {
    close: (sessionId: string) => {
      const session = sessions.get(sessionId);
      if (!session) return;
      session.closing = true;
      if (session.reconnectTimer) clearTimeout(session.reconnectTimer);
      sessions.delete(sessionId);
      if (
        session.socket?.readyState === WebSocket.OPEN ||
        session.socket?.readyState === WebSocket.CONNECTING
      )
        session.socket.close(1000, "call_finished");
    },
    connect: ({
      eventRelayUrl,
      providerCallId,
      sessionId,
    }: {
      readonly eventRelayUrl: string;
      readonly providerCallId: string;
      readonly sessionId: string;
    }) => {
      connect(sessionId, providerCallId, eventRelayUrl);
    },
    size: () => sessions.size,
  };
};

export type AmaziEventRelay = ReturnType<typeof createAmaziEventRelay>;
