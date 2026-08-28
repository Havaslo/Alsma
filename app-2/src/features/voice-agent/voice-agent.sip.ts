import type { Request, RequestHandler } from "express";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import WebSocket from "ws";

import { voiceAgentTools } from "./voice-agent.tools.js";

type RawRequest = Request & { readonly rawBody?: Buffer };

type OpenAiWebhook = {
  readonly data?: { readonly call_id?: string };
  readonly type?: string;
};

type OpenAiToolEvent = {
  readonly type?: string;
  readonly call_id?: string;
  readonly name?: string;
  readonly arguments?: string;
};

type OpenAiTranscriptEvent = {
  readonly type?: string;
  readonly transcript?: string;
  readonly item_id?: string;
};

const signatureToleranceSeconds = 300;

const decodeSecret = (secret: string): Buffer => {
  const value = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  return Buffer.from(value, "base64");
};

const verifyWebhook = (request: RawRequest, webhookSecret: string): boolean => {
  const body = request.rawBody;
  const webhookId = request.header("webhook-id");
  const timestamp = request.header("webhook-timestamp");
  const signatures = request.header("webhook-signature");
  if (!body || !webhookId || !timestamp || !signatures) return false;

  const timestampNumber = Number(timestamp);
  if (
    !Number.isFinite(timestampNumber) ||
    Math.abs(Date.now() / 1_000 - timestampNumber) > signatureToleranceSeconds
  )
    return false;

  const expected = createHmac("sha256", decodeSecret(webhookSecret))
    .update(`${webhookId}.${timestamp}.${body.toString("utf8")}`)
    .digest();

  return signatures.split(" ").some((candidate) => {
    const encoded = candidate.startsWith("v1,")
      ? candidate.slice(3)
      : candidate;
    try {
      const received = Buffer.from(encoded, "base64");
      return (
        received.length === expected.length &&
        timingSafeEqual(received, expected)
      );
    } catch {
      return false;
    }
  });
};

export const buildSipAcceptPayload = (instructions: string) => ({
  audio: {
    input: {
      turn_detection: {
        type: "server_vad",
        create_response: true,
        interrupt_response: true,
      },
    },
    output: { voice: "marin" },
  },
  type: "realtime",
  model: "gpt-realtime-2.1",
  instructions,
  output_modalities: ["audio"],
  tools: voiceAgentTools,
});

export const isRealtimeReadyEvent = (type?: string) =>
  type === "session.updated";

export const isRealtimeTranscriptEvent = (type?: string) =>
  [
    "conversation.item.input_audio_transcription.completed",
    "conversation.item.input_audio_transcription.done",
    "response.audio_transcript.done",
  ].includes(type ?? "");

export const createOpenAiSipHandler =
  ({
    apiKey,
    baseUrl,
    getInstructions,
    onIncomingCall,
    onToolCall,
    onTranscript,
    webhookSecret,
  }: {
    readonly apiKey?: string;
    readonly baseUrl: string;
    readonly getInstructions: () => Promise<string>;
    readonly onIncomingCall?: (providerCallId: string) => Promise<void>;
    readonly onToolCall?: (
      providerCallId: string,
      name: string,
      args: unknown,
    ) => Promise<unknown>;
    readonly onTranscript?: (
      providerCallId: string,
      role: "guest" | "assistant",
      text: string,
    ) => Promise<void>;
    readonly webhookSecret?: string;
  }): RequestHandler =>
  async (request, response) => {
    const requestId = randomUUID();
    if (!apiKey || !webhookSecret) {
      response.status(503).json({
        error: {
          code: "sip_not_configured",
          message: "Прямой OpenAI SIP не настроен.",
          requestId,
        },
      });
      return;
    }
    if (!verifyWebhook(request as RawRequest, webhookSecret)) {
      response.status(401).json({
        error: {
          code: "invalid_webhook_signature",
          message: "Подпись webhook OpenAI недействительна.",
          requestId,
        },
      });
      return;
    }

    const event = request.body as OpenAiWebhook;
    if (event.type !== "realtime.call.incoming") {
      response.status(200).json({ received: true, requestId });
      return;
    }
    const callId = event.data?.call_id;
    if (!callId) {
      response.status(400).json({
        error: {
          code: "missing_call_id",
          message: "Webhook OpenAI не содержит call_id.",
          requestId,
        },
      });
      return;
    }

    await onIncomingCall?.(`openai:${callId}`);

    const upstream = await fetch(
      `${baseUrl.replace(/\/$/u, "")}/realtime/calls/${encodeURIComponent(callId)}/accept`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildSipAcceptPayload(await getInstructions())),
        signal: AbortSignal.timeout(15_000),
      },
    );
    if (!upstream.ok) {
      const providerRequestId = upstream.headers.get("x-request-id");
      response.status(502).json({
        error: {
          code: "openai_call_accept_failed",
          message: `OpenAI не принял звонок: HTTP ${upstream.status}.`,
          providerRequestId,
          requestId,
        },
      });
      return;
    }

    const realtime = new WebSocket(
      `${baseUrl.replace(/\/$/u, "")}/realtime?call_id=${encodeURIComponent(callId)}`,
      { headers: { Authorization: `Bearer ${apiKey}` } },
    );
    let failureHangupTimer: NodeJS.Timeout | undefined;
    const hangup = () => {
      void fetch(
        `${baseUrl.replace(/\/$/u, "")}/realtime/calls/${encodeURIComponent(callId)}/hangup`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(10_000),
        },
      ).catch(() => undefined);
    };
    realtime.on("open", () => {
      realtime.send(
        JSON.stringify({
          type: "session.update",
          session: {
            input_audio_transcription: { model: "gpt-4o-mini-transcribe" },
            turn_detection: {
              type: "server_vad",
              create_response: true,
              interrupt_response: true,
            },
          },
        }),
      );
    });
    realtime.on("message", (data, isBinary) => {
      if (isBinary) return;
      let event: OpenAiToolEvent & OpenAiTranscriptEvent;
      try {
        event = JSON.parse(data.toString()) as OpenAiToolEvent &
          OpenAiTranscriptEvent;
      } catch {
        return;
      }
      if (
        onTranscript &&
        typeof event.transcript === "string" &&
        event.transcript.trim() &&
        isRealtimeTranscriptEvent(event.type)
      ) {
        void onTranscript(
          `openai:${callId}`,
          event.type?.startsWith("response.") ? "assistant" : "guest",
          event.transcript.trim(),
        );
      }
      if (isRealtimeReadyEvent(event.type)) {
        realtime.send(JSON.stringify({ type: "response.create" }));
        return;
      }
      if (!onToolCall) return;
      if (
        event.type !== "response.function_call_arguments.done" ||
        !event.call_id ||
        !event.name
      )
        return;
      void (async () => {
        let args: unknown = {};
        try {
          args = JSON.parse(event.arguments ?? "{}");
        } catch {
          args = {};
        }
        const result = await onToolCall(`openai:${callId}`, event.name!, args);
        if (realtime.readyState !== WebSocket.OPEN) return;
        realtime.send(
          JSON.stringify({
            type: "conversation.item.create",
            item: {
              type: "function_call_output",
              call_id: event.call_id,
              output: JSON.stringify(result),
            },
          }),
        );
        if (
          result &&
          typeof result === "object" &&
          "accepted" in result &&
          (result as { accepted?: unknown }).accepted === false
        ) {
          failureHangupTimer = setTimeout(hangup, 15_000);
        }
        realtime.send(JSON.stringify({ type: "response.create" }));
      })().catch(() => {
        if (realtime.readyState === WebSocket.OPEN)
          realtime.send(
            JSON.stringify({
              type: "conversation.item.create",
              item: {
                type: "function_call_output",
                call_id: event.call_id,
                output: JSON.stringify({
                  accepted: false,
                  reason: "tool_failed",
                }),
              },
            }),
          );
        failureHangupTimer = setTimeout(hangup, 15_000);
      });
    });
    realtime.on("close", () => {
      if (failureHangupTimer) clearTimeout(failureHangupTimer);
    });

    response.status(200).json({ accepted: true, requestId });
  };
