import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";

import { HttpError } from "../../lib/http/http-error.js";
import {
  type MangoWebhookBody,
  mangoCallEventSchema,
  mangoRecordingAddedEventSchema,
  mangoRecordingEventSchema,
  mangoSummaryEventSchema,
  mangoTransferResultSchema,
  mangoWebhookBodySchema,
} from "./voice-agent.schemas.js";

const mangoEnvelopeSchema = z.object({
  vpbx_api_key: z.string().min(1).max(128),
  sign: z.string().regex(/^[a-f0-9]{64}$/iu),
  json: z.string().min(2).max(512_000),
});

export type MangoProviderEvent =
  | {
      readonly kind: "transfer_result";
      readonly event: z.infer<typeof mangoTransferResultSchema>;
      readonly eventKey: string;
    }
  | {
      readonly kind: "call";
      readonly event: z.infer<typeof mangoCallEventSchema>;
      readonly eventKey: string;
    }
  | {
      readonly kind: "summary";
      readonly event: z.infer<typeof mangoSummaryEventSchema>;
      readonly eventKey: string;
    }
  | {
      readonly kind: "recording";
      readonly event: z.infer<typeof mangoRecordingEventSchema>;
      readonly eventKey: string;
    }
  | {
      readonly kind: "recording_added";
      readonly event: z.infer<typeof mangoRecordingAddedEventSchema>;
      readonly eventKey: string;
    }
  | {
      readonly kind: "normalized";
      readonly event: MangoWebhookBody;
      readonly eventKey: string;
    };

const invalidWebhook = (message: string, status = 400): HttpError =>
  new HttpError(status, "INVALID_MANGO_WEBHOOK", message);

const equalSecret = (received: string, expected: string): boolean => {
  const receivedBytes = Buffer.from(received);
  const expectedBytes = Buffer.from(expected);
  return (
    receivedBytes.length === expectedBytes.length &&
    timingSafeEqual(receivedBytes, expectedBytes)
  );
};

export const verifyMangoSignature = ({
  apiKey,
  salt,
  formApiKey,
  json,
  sign,
}: {
  readonly apiKey: string;
  readonly salt: string;
  readonly formApiKey: string;
  readonly json: string;
  readonly sign: string;
}): boolean => {
  if (!equalSecret(formApiKey, apiKey) || !/^[a-f0-9]{64}$/iu.test(sign))
    return false;
  const expected = createHash("sha256")
    .update(`${apiKey}${json}${salt}`)
    .digest("hex");
  return equalSecret(sign.toLowerCase(), expected);
};

const parseProviderJson = (json: string): MangoProviderEvent => {
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    throw invalidWebhook("MANGO json field must contain valid JSON.");
  }

  const transfer = mangoTransferResultSchema.safeParse(value);
  if (transfer.success)
    return {
      kind: "transfer_result",
      event: transfer.data,
      eventKey: `mango:transfer:${transfer.data.command_id}:${transfer.data.result}`,
    };
  const call = mangoCallEventSchema.safeParse(value);
  if (call.success)
    return {
      event: call.data,
      eventKey: `mango:call:${call.data.entry_id}:${call.data.call_id}:${call.data.seq ?? `${call.data.call_state}:${call.data.timestamp}`}`,
      kind: "call",
    };

  const recording = mangoRecordingEventSchema.safeParse(value);
  if (recording.success)
    return {
      event: recording.data,
      eventKey: `mango:recording:${recording.data.entry_id}:${recording.data.recording_id}:${recording.data.seq ?? recording.data.recording_state}`,
      kind: "recording",
    };

  const recordingAdded = mangoRecordingAddedEventSchema.safeParse(value);
  if (recordingAdded.success)
    return {
      event: recordingAdded.data,
      eventKey: `mango:recording-added:${recordingAdded.data.entry_id}:${recordingAdded.data.recording_id}`,
      kind: "recording_added",
    };

  const summary = mangoSummaryEventSchema.safeParse(value);
  if (summary.success)
    return {
      event: summary.data,
      eventKey: `mango:summary:${summary.data.entry_id}:${summary.data.end_time}`,
      kind: "summary",
    };

  throw invalidWebhook(
    "MANGO event payload is not a supported realtime event.",
  );
};

export const parseMangoWebhook = ({
  apiKey,
  body,
  salt,
}: {
  readonly apiKey?: string;
  readonly body: unknown;
  readonly salt?: string;
}): MangoProviderEvent => {
  const envelope = mangoEnvelopeSchema.safeParse(body);
  if (envelope.success) {
    if (
      !apiKey ||
      !salt ||
      !verifyMangoSignature({
        apiKey,
        formApiKey: envelope.data.vpbx_api_key,
        json: envelope.data.json,
        salt,
        sign: envelope.data.sign,
      })
    )
      throw invalidWebhook("MANGO webhook signature is invalid.", 401);
    return parseProviderJson(envelope.data.json);
  }

  const normalized = mangoWebhookBodySchema.safeParse(body);
  if (normalized.success)
    return {
      event: normalized.data,
      eventKey: `legacy:${normalized.data.event}:${normalized.data.callId}:${normalized.data.status ?? ""}`,
      kind: "normalized",
    };

  throw invalidWebhook("MANGO webhook body has an unsupported shape.");
};
