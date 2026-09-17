import { timingSafeEqual } from "node:crypto";
import { z } from "zod";

import { HttpError } from "../../lib/http/http-error.js";

const amaziEventTypes = [
  "voice.call.started",
  "voice.call.connected",
  "voice.call.completed",
  "voice.call.failed",
] as const;

const amaziPayloadSchema = z.object({}).passthrough();

export type AmaziEventType = (typeof amaziEventTypes)[number];

export type AmaziWebhookEvent = {
  readonly eventKey: string;
  readonly eventType: AmaziEventType;
  readonly occurredAt?: Date;
  readonly callerPhone?: string;
  readonly sessionId: string;
};

const invalidAmaziWebhook = (message: string, status = 400): HttpError =>
  new HttpError(status, "INVALID_AMAZI_WEBHOOK", message);

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

const firstString = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const result = value.trim();
    if (result) return result;
  }
  return undefined;
};

const envelopeRecords = (
  body: Record<string, unknown>,
): readonly Record<string, unknown>[] => {
  const records: Record<string, unknown>[] = [body];
  const queue: Record<string, unknown>[] = [body];
  const envelopeKeys = [
    "data",
    "event",
    "event_data",
    "eventData",
    "metadata",
    "payload",
  ];
  while (queue.length > 0) {
    const record = queue.shift();
    if (!record) continue;
    for (const key of envelopeKeys) {
      const child = asRecord(record[key]);
      if (!child || records.includes(child)) continue;
      records.push(child);
      queue.push(child);
    }
  }
  return records;
};

const eventType = (
  body: Record<string, unknown>,
): AmaziEventType | undefined => {
  for (const record of envelopeRecords(body)) {
    const value = firstString(
      record.type,
      record.event,
      record.event_type,
      record.eventType,
    );
    if (amaziEventTypes.includes(value as AmaziEventType))
      return value as AmaziEventType;
  }
  return undefined;
};

const sessionId = (body: Record<string, unknown>): string | undefined => {
  const records = envelopeRecords(body);
  for (const record of records) {
    const direct = firstString(
      record.session_id,
      record.sessionId,
      typeof record.session === "string" ? record.session : undefined,
    );
    if (direct) return direct;
    const call = asRecord(record.call);
    const callSessionId = firstString(call?.session_id, call?.sessionId);
    if (callSessionId) return callSessionId;
    for (const key of ["session", "conversation"]) {
      const container = asRecord(record[key]);
      const nestedId = firstString(
        container?.session_id,
        container?.sessionId,
        container?.id,
      );
      if (nestedId) return nestedId;
    }
  }
  return undefined;
};

const callerPhone = (body: Record<string, unknown>): string | undefined => {
  for (const record of envelopeRecords(body)) {
    const call = asRecord(record.call);
    const caller = asRecord(record.caller) ?? asRecord(call?.caller);
    const from = asRecord(record.from) ?? asRecord(call?.from) ?? caller;
    const value = firstString(
      record.caller_phone,
      record.callerPhone,
      record.callerIdentity,
      record.phone_number,
      record.phoneNumber,
      call?.caller_phone,
      call?.callerPhone,
      call?.phone_number,
      call?.phoneNumber,
      caller?.phone,
      from?.number,
      from?.phone,
    );
    if (value) return value;
  }
  return undefined;
};

const eventId = (body: Record<string, unknown>): string | undefined => {
  for (const record of envelopeRecords(body)) {
    const value = firstString(record.event_id, record.eventId, record.id);
    if (value) return value;
  }
  return undefined;
};

const occurredAt = (body: Record<string, unknown>): Date | undefined => {
  for (const record of envelopeRecords(body)) {
    const value = record.timestamp ?? record.occurred_at ?? record.occurredAt;
    if (typeof value === "number" || typeof value === "string") {
      const numeric = typeof value === "number" ? value : Number(value);
      const date = Number.isFinite(numeric)
        ? new Date(numeric < 10_000_000_000 ? numeric * 1_000 : numeric)
        : new Date(value);
      if (!Number.isNaN(date.getTime())) return date;
    }
  }
  return undefined;
};

export const amaziProviderCallId = (session: string) => `amazi:${session}`;

export const hasValidAmaziBearer = (
  authorization: string | undefined,
  secret: string,
): boolean => {
  const prefix = "Bearer ";
  if (!authorization?.startsWith(prefix)) return false;
  const received = Buffer.from(authorization.slice(prefix.length));
  const expected = Buffer.from(secret);
  return (
    received.length === expected.length && timingSafeEqual(received, expected)
  );
};

export const parseAmaziRelayUrl = (
  value: string | undefined,
): string | undefined => {
  if (!value) return undefined;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw invalidAmaziWebhook("Amazi event relay URL is invalid.");
  }
  if (url.protocol !== "ws:" && url.protocol !== "wss:")
    throw invalidAmaziWebhook("Amazi event relay URL must use ws or wss.");
  if (url.username || url.password)
    throw invalidAmaziWebhook(
      "Amazi event relay URL must not contain credentials.",
    );
  return url.toString();
};

export const parseAmaziWebhook = ({
  body,
  headerSessionId,
}: {
  readonly body: unknown;
  readonly headerSessionId?: string;
}): AmaziWebhookEvent => {
  const parsed = amaziPayloadSchema.safeParse(body);
  if (!parsed.success)
    throw invalidAmaziWebhook("Amazi webhook body is invalid.");
  const payloadSessionId = sessionId(parsed.data);
  const normalizedHeaderSessionId = headerSessionId?.trim() || undefined;
  if (
    payloadSessionId &&
    normalizedHeaderSessionId &&
    payloadSessionId !== normalizedHeaderSessionId
  )
    throw invalidAmaziWebhook("Amazi session identifiers do not match.");
  const resolvedSessionId = payloadSessionId ?? normalizedHeaderSessionId;
  const resolvedEventType = eventType(parsed.data);
  if (!resolvedSessionId)
    throw invalidAmaziWebhook("Amazi webhook session id is missing.");
  if (resolvedSessionId.length > 200)
    throw invalidAmaziWebhook("Amazi webhook session id is too long.");
  if (!resolvedEventType)
    throw invalidAmaziWebhook("Amazi webhook event type is unsupported.");
  const occurred = occurredAt(parsed.data);
  const id = eventId(parsed.data);
  return {
    callerPhone: callerPhone(parsed.data),
    eventKey: `amazi:${resolvedSessionId}:${id ?? `${resolvedEventType}:${occurred?.toISOString() ?? ""}`}`,
    eventType: resolvedEventType,
    occurredAt: occurred,
    sessionId: resolvedSessionId,
  };
};
