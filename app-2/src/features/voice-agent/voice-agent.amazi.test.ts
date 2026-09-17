import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";

import type { Database } from "../../lib/database/database.js";
import { hasValidAmaziBearer, parseAmaziWebhook } from "./voice-agent.amazi.js";
import { createAmaziEventRelay } from "./voice-agent.amazi.relay.js";
import { createAmaziWebhookHandler } from "./voice-agent.handlers.js";
import type { VoiceAgentRepository } from "./voice-agent.repository.js";
import { createVoiceAgentService } from "./voice-agent.service.js";

test("parses an Amazi lifecycle event from the header and ignores extra fields", () => {
  const first = parseAmaziWebhook({
    body: {
      type: "voice.call.started",
      data: { callerPhone: "+7 (900) 000-00-01" },
      ignored: { prompt: "must not be persisted" },
    },
    headerSessionId: "session-1",
  });
  const duplicate = parseAmaziWebhook({
    body: { type: "voice.call.started", session_id: "session-1" },
  });

  assert.equal(first.sessionId, "session-1");
  assert.equal(first.callerPhone, "+7 (900) 000-00-01");
  assert.equal(first.eventKey, duplicate.eventKey);
  const nestedEnvelope = parseAmaziWebhook({
    body: {
      event: {
        type: "voice.call.connected",
        payload: { conversation: { id: "session-2" } },
      },
    },
  });
  assert.equal(nestedEnvelope.sessionId, "session-2");
  assert.throws(() =>
    parseAmaziWebhook({
      body: { type: "voice.call.started", session_id: "other" },
      headerSessionId: "session-1",
    }),
  );
});

test("validates the configured Amazi bearer without exposing the secret", () => {
  assert.equal(hasValidAmaziBearer("Bearer test-secret", "test-secret"), true);
  assert.equal(hasValidAmaziBearer("Bearer wrong", "test-secret"), false);
  assert.equal(hasValidAmaziBearer(undefined, "test-secret"), false);
});

test("accepts Amazi webhook events idempotently after authentication", async () => {
  let claimCount = 0;
  const service = {
    claimAmaziWebhook: async () => {
      claimCount += 1;
      return false;
    },
    handleAmaziWebhook: async () => undefined,
    releaseAmaziWebhook: async () => undefined,
  };
  const handler = createAmaziWebhookHandler({
    closeRelay: () => undefined,
    secret: "test-secret",
    service: service as never,
  });
  const responseState = { body: undefined as unknown, status: 0 };
  const response = {
    json(body: unknown) {
      responseState.body = body;
      return this;
    },
    status(status: number) {
      responseState.status = status;
      return this;
    },
  };
  const request = {
    body: { type: "voice.call.connected", session_id: "session-1" },
    header(name: string) {
      return name === "authorization" ? "Bearer test-secret" : undefined;
    },
  };
  let nextError: unknown;
  await handler(request as never, response as never, (error: unknown) => {
    nextError = error;
  });

  assert.equal(nextError, undefined);
  assert.equal(claimCount, 1);
  assert.equal(responseState.status, 202);
  assert.deepEqual(responseState.body, { duplicate: true, received: true });
});

test("creates an Amazi provider context with a stable call identity", async () => {
  const updates: Array<Record<string, unknown>> = [];
  const repository = {
    findByProviderCallId: async () => null,
    findActiveAmaziCallByCallerPhone: async () => null,
    ensureCall: async () => ({
      id: "call-id",
      provider: "amazi",
      providerCallId: "amazi:session-1",
    }),
    updateCall: async (_id: string, data: Record<string, unknown>) => {
      updates.push(data);
      return { id: "call-id", ...data };
    },
  } as unknown as VoiceAgentRepository;
  const service = createVoiceAgentService(
    repository,
    {} as Database,
    undefined,
    undefined,
  );

  await service.ensureAmaziCall({
    callerPhone: "+79000000001",
    sessionId: "session-1",
  });

  assert.equal(updates[0]?.providerCallId, "amazi:session-1");
  assert.equal(updates[0]?.provider, "amazi");
});

test("links a late Amazi lifecycle event to the unique nearby Mango call", async () => {
  const occurredAt = new Date("2026-09-15T10:45:39.475Z");
  const mangoCall = {
    id: "mango-row",
    mangoCallId: "mango-call-1",
    mangoTransferInitiator: "sip:amz-QGAXutRFNlNhpI8bCputsoAq@api.amazi.pro",
    provider: "mango",
    providerCallId: "mango-call-1",
    status: "active",
  };
  const updates: Array<{ id: string; data: Record<string, unknown> }> = [];
  let currentCall = mangoCall;
  let ensureCount = 0;
  const repository = {
    findByProviderCallId: async () => null,
    findActiveAmaziCallByCallerPhone: async () => null,
    findUniqueMangoCallNear: async (at: Date) => {
      assert.equal(at.getTime(), occurredAt.getTime());
      return mangoCall;
    },
    ensureCall: async () => {
      ensureCount += 1;
      return mangoCall;
    },
    updateCall: async (id: string, data: Record<string, unknown>) => {
      updates.push({ data, id });
      currentCall = { ...currentCall, ...data };
      return currentCall;
    },
  } as unknown as VoiceAgentRepository;
  const service = createVoiceAgentService(
    repository,
    {} as Database,
    undefined,
    undefined,
  );

  const result = await service.handleAmaziWebhook({
    callerPhone: "+79000000001",
    eventKey: "amazi:session-1:started",
    eventType: "voice.call.started",
    occurredAt,
    sessionId: "session-1",
  });

  assert.equal(ensureCount, 1);
  assert.equal(result?.id, "mango-row");
  assert.equal(result?.providerCallId, "amazi:session-1");
  assert.equal(result?.mangoCallId, "mango-call-1");
  assert.equal(
    result?.mangoTransferInitiator,
    "sip:amz-QGAXutRFNlNhpI8bCputsoAq@api.amazi.pro",
  );
  assert.equal(
    updates.some(
      ({ data, id }) =>
        id === "mango-row" &&
        data.providerCallId === "amazi:session-1" &&
        data.mangoCallId === "mango-call-1",
    ),
    true,
  );
});

test("links an existing Amazi call to a nearby completed Mango call", async () => {
  const amaziCall = {
    id: "amazi-row",
    mangoCallId: null,
    provider: "amazi",
    providerCallId: "amazi:session-terminal",
    status: "active",
  };
  const mangoCall = {
    id: "mango-row",
    mangoCallId: "mango-call-terminal",
    mangoTransferInitiator: "sip:amz-QGAXutRFNlNhpI8bCputsoAq@api.amazi.pro",
    provider: "mango",
    providerCallId: "mango-call-terminal",
    status: "completed",
  };
  let updatedId: string | undefined;
  let update: Record<string, unknown> | undefined;
  const repository = {
    findByProviderCallId: async () => amaziCall,
    findActiveAmaziCallByCallerPhone: async () => null,
    findUniqueMangoCallNear: async () => mangoCall,
    ensureCall: async (input: Record<string, unknown>) => ({
      ...amaziCall,
      ...input,
    }),
    updateCall: async (id: string, data: Record<string, unknown>) => {
      updatedId = id;
      update = { ...(update ?? amaziCall), ...data };
      return update;
    },
  } as unknown as VoiceAgentRepository;
  const service = createVoiceAgentService(
    repository,
    {} as Database,
    undefined,
    undefined,
  );

  await service.handleAmaziWebhook({
    eventKey: "amazi:session-terminal:completed",
    eventType: "voice.call.completed",
    occurredAt: new Date("2026-09-16T10:17:53.343Z"),
    sessionId: "session-terminal",
  });

  assert.equal(updatedId, "amazi-row");
  assert.equal(update?.mangoCallId, "mango-call-terminal");
  assert.equal(
    update?.mangoTransferInitiator,
    "sip:amz-QGAXutRFNlNhpI8bCputsoAq@api.amazi.pro",
  );
  assert.equal(update?.providerCallId, "amazi:session-terminal");
});

test("does not link Amazi to an ambiguous nearby Mango match", async () => {
  const amaziCall = {
    id: "amazi-row",
    provider: "amazi",
    providerCallId: "amazi:session-ambiguous",
    status: "active",
  };
  let ensureCount = 0;
  const repository = {
    findByProviderCallId: async () => null,
    findActiveAmaziCallByCallerPhone: async () => null,
    // The repository returns null for both zero and multiple candidates.
    findUniqueMangoCallNear: async () => null,
    ensureCall: async () => {
      ensureCount += 1;
      return amaziCall;
    },
    updateCall: async (_id: string, data: Record<string, unknown>) => ({
      ...amaziCall,
      ...data,
    }),
  } as unknown as VoiceAgentRepository;
  const service = createVoiceAgentService(
    repository,
    {} as Database,
    undefined,
    undefined,
  );

  const result = await service.handleAmaziWebhook({
    eventKey: "amazi:session-ambiguous:started",
    eventType: "voice.call.started",
    occurredAt: new Date("2026-09-15T10:45:39.475Z"),
    sessionId: "session-ambiguous",
  });

  assert.equal(ensureCount, 1);
  assert.equal(result?.id, "amazi-row");
  assert.equal(result?.providerCallId, "amazi:session-ambiguous");
});

const silentLogger = { error: () => undefined, warn: () => undefined } as never;

const createWebhookResponse = () => {
  const state = { body: undefined as unknown, status: 0 };
  const response = {
    json(body: unknown) {
      state.body = body;
      return this;
    },
    status(status: number) {
      state.status = status;
      return this;
    },
  };
  return { response, state };
};

test("returns 202 for valid Amazi lifecycle events after claiming each event", async () => {
  const handled: string[] = [];
  const greeted: string[] = [];
  const service = {
    claimAmaziWebhook: async () => true,
    handleAmaziWebhook: async (event: { eventType: string }) => {
      handled.push(event.eventType);
    },
    releaseAmaziWebhook: async () => undefined,
  };
  for (const eventType of [
    "voice.call.started",
    "voice.call.connected",
    "voice.call.completed",
  ]) {
    const { response, state } = createWebhookResponse();
    let nextError: unknown;
    const handler = createAmaziWebhookHandler({
      closeRelay: () => undefined,
      greetRelay: (sessionId) => greeted.push(sessionId),
      logger: silentLogger,
      service: service as never,
    });
    await handler(
      {
        body: { type: eventType, data: { sessionId: "lifecycle-session" } },
        header: () => undefined,
      } as never,
      response as never,
      (error: unknown) => {
        nextError = error;
      },
    );
    assert.equal(nextError, undefined);
    assert.equal(state.status, 202);
    assert.deepEqual(state.body, { received: true });
  }
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(handled, [
    "voice.call.started",
    "voice.call.connected",
    "voice.call.completed",
  ]);
  assert.deepEqual(greeted, ["lifecycle-session"]);
});

test("releases a durable Amazi claim when lifecycle handling fails", async () => {
  const released: string[] = [];
  const service = {
    claimAmaziWebhook: async () => true,
    handleAmaziWebhook: async () => {
      throw new Error("lifecycle failed");
    },
    releaseAmaziWebhook: async (eventKey: string) => {
      released.push(eventKey);
    },
  };
  const { response, state } = createWebhookResponse();
  let nextError: unknown;
  const handler = createAmaziWebhookHandler({
    closeRelay: () => undefined,
    logger: silentLogger,
    service: service as never,
  });
  await handler(
    {
      body: { type: "voice.call.connected", session_id: "failed-session" },
      header: () => undefined,
    } as never,
    response as never,
    (error: unknown) => {
      nextError = error;
    },
  );
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(nextError, undefined);
  assert.equal(state.status, 202);
  assert.deepEqual(released, ["amazi:failed-session:voice.call.connected:"]);
});

test("rejects an Amazi webhook without session metadata instead of claiming it", async () => {
  let claimCount = 0;
  const service = {
    claimAmaziWebhook: async () => {
      claimCount += 1;
      return true;
    },
    handleAmaziWebhook: async () => undefined,
    releaseAmaziWebhook: async () => undefined,
  };
  const { response, state } = createWebhookResponse();
  let nextError: unknown;
  const handler = createAmaziWebhookHandler({
    closeRelay: () => undefined,
    logger: silentLogger,
    service: service as never,
  });
  await handler(
    {
      body: { type: "voice.call.started", data: { callerPhone: "+7000" } },
      header: () => undefined,
    } as never,
    response as never,
    (error: unknown) => {
      nextError = error;
    },
  );

  assert.equal(claimCount, 0);
  assert.equal(state.status, 0);
  assert.equal((nextError as { status?: number })?.status, 400);
});
