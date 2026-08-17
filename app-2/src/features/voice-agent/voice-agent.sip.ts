import type { Request, RequestHandler } from "express";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

type RawRequest = Request & { readonly rawBody?: Buffer };

type OpenAiWebhook = {
  readonly data?: { readonly call_id?: string };
  readonly type?: string;
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

export const createOpenAiSipHandler =
  ({
    apiKey,
    baseUrl,
    getInstructions,
    webhookSecret,
  }: {
    readonly apiKey?: string;
    readonly baseUrl: string;
    readonly getInstructions: () => Promise<string>;
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

    const upstream = await fetch(
      `${baseUrl.replace(/\/$/u, "")}/realtime/calls/${encodeURIComponent(callId)}/accept`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "realtime",
          model: "gpt-realtime",
          instructions: await getInstructions(),
          audio: { output: { voice: "marin" } },
        }),
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

    response.status(200).json({ accepted: true, callId, requestId });
  };
