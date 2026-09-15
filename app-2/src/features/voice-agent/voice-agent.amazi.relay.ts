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
type RelaySocketConstructor = new (url: string) => RelaySocket;

type AmaziRelayOptions = {
  readonly logger?: Logger;
  readonly service: Pick<
    VoiceAgentService,
    "appendTranscriptByProvider" | "toolForProviderCall"
  >;
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
};

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
  WebSocketClass = WebSocket,
}: AmaziRelayOptions) => {
  const sessions = new Map<string, RelaySession>();

  const sendToolOutput = (
    session: RelaySession,
    callId: string,
    result: unknown,
  ) => {
    if (session.socket.readyState !== WebSocket.OPEN) return;
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

  const wire = (session: RelaySession) => {
    session.socket.on("message", (data, isBinary) => {
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
    session.socket.on("error", (error) => {
      logger.warn(
        {
          error: error.name,
          sessionId: session.sessionId,
          stage: "amazi_relay_socket",
        },
        "Amazi event relay socket failed",
      );
    });
    session.socket.on("close", () => {
      if (sessions.get(session.sessionId) !== session) return;
      sessions.delete(session.sessionId);
      if (session.closing || session.reconnectAttempts >= 1) return;
      session.reconnectAttempts += 1;
      session.reconnectTimer = setTimeout(() => {
        if (!sessions.has(session.sessionId))
          connect(
            session.sessionId,
            session.providerCallId,
            session.eventRelayUrl,
            session.reconnectAttempts,
          );
      }, 250);
    });
  };

  const connect = (
    sessionId: string,
    providerCallId: string,
    eventRelayUrl: string,
    reconnectAttempts = 0,
  ): void => {
    if (sessions.has(sessionId)) return;
    const session = {
      eventRelayUrl,
      providerCallId,
      reconnectAttempts,
      sessionId,
      socket: new WebSocketClass(eventRelayUrl),
      toolCallIds: new Set<string>(),
      closing: false,
    } satisfies RelaySession;
    sessions.set(sessionId, session);
    wire(session);
  };

  return {
    close: (sessionId: string) => {
      const session = sessions.get(sessionId);
      if (!session) return;
      session.closing = true;
      if (session.reconnectTimer) clearTimeout(session.reconnectTimer);
      sessions.delete(sessionId);
      if (
        session.socket.readyState === WebSocket.OPEN ||
        session.socket.readyState === WebSocket.CONNECTING
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
