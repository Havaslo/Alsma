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

class FakeRelaySocket extends EventEmitter {
  static readonly instances: FakeRelaySocket[] = [];
  readonly sent: string[] = [];
  readyState = 1;

  constructor(readonly url: string) {
    super();
    FakeRelaySocket.instances.push(this);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.readyState = 3;
    this.emit("close");
  }
}

test("executes an Amazi relay tool once and returns function output on the same relay", async () => {
  FakeRelaySocket.instances.length = 0;
  const toolCalls: Array<{ providerCallId: string; name: string }> = [];
  const relay = createAmaziEventRelay({
    service: {
      appendTranscriptByProvider: async () => null,
      toolForProviderCall: async (providerCallId, name) => {
        toolCalls.push({ name, providerCallId });
        return { accepted: false, reason: "mango_transfer_initiator_missing" };
      },
    },
    WebSocketClass: FakeRelaySocket as never,
  });
  relay.connect({
    eventRelayUrl: "wss://relay.example/session",
    providerCallId: "amazi:session-1",
    sessionId: "session-1",
  });
  relay.connect({
    eventRelayUrl: "wss://relay.example/session",
    providerCallId: "amazi:session-1",
    sessionId: "session-1",
  });

  const socket = FakeRelaySocket.instances[0];
  assert.ok(socket);
  socket.emit(
    "message",
    Buffer.from(
      JSON.stringify({
        type: "response.function_call_arguments.done",
        call_id: "function-call-1",
        name: "transfer_to_manager",
        arguments: JSON.stringify({ reason: "guest-request" }),
      }),
    ),
    false,
  );
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(FakeRelaySocket.instances.length, 1);
  assert.deepEqual(toolCalls, [
    { name: "transfer_to_manager", providerCallId: "amazi:session-1" },
  ]);
  assert.match(socket.sent[0] ?? "", /function_call_output/u);
  assert.match(socket.sent[1] ?? "", /response\.create/u);
  relay.close("session-1");
});
