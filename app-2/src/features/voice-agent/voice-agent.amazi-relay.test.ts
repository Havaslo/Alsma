import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";

import type { Database } from "../../lib/database/database.js";
import { hasValidAmaziBearer, parseAmaziWebhook } from "./voice-agent.amazi.js";
import { createAmaziEventRelay } from "./voice-agent.amazi.relay.js";
import { createAmaziWebhookHandler } from "./voice-agent.handlers.js";
import type { VoiceAgentRepository } from "./voice-agent.repository.js";
import { createVoiceAgentService } from "./voice-agent.service.js";

class FakeRelaySocket extends EventEmitter {
  static readonly instances: FakeRelaySocket[] = [];
  readonly sent: string[] = [];
  readyState = 1;

  constructor(
    readonly url: string,
    readonly options?: { readonly headers?: Record<string, string> },
  ) {
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

const silentLogger = {
  error: () => undefined,
  warn: () => undefined,
} as never;

const wait = async (milliseconds: number) => {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
};

const setupGreetingRelay = () => {
  FakeRelaySocket.instances.length = 0;
  const relay = createAmaziEventRelay({
    logger: silentLogger,
    service: {
      appendTranscriptByProvider: async () => null,
      toolForProviderCall: async () => ({ accepted: true, state: "accepted" }),
    },
    WebSocketClass: FakeRelaySocket as never,
  });
  relay.connect({
    eventRelayUrl: "wss://relay.example/session",
    providerCallId: "amazi:greeting",
    sessionId: "greeting",
  });
  return { relay, socket: FakeRelaySocket.instances[0]! };
};

test("greets only after media connects and does not repeat on relay reconnect", async () => {
  const { relay, socket } = setupGreetingRelay();
  try {
    socket.emit("open");
    assert.equal(socket.sent.length, 0);
    relay.greet("greeting");
    relay.greet("greeting");
    assert.equal(socket.sent.length, 1);
    const event = JSON.parse(socket.sent[0]!);
    assert.equal(event.type, "response.create");
    assert.deepEqual(event.response.output_modalities, ["audio"]);
    assert.equal(event.response.tool_choice, "none");
    assert.match(event.response.instructions, /Я голосовой помощник Алсмы/u);
    socket.close();
    await wait(300);
    const replacement = FakeRelaySocket.instances[1]!;
    replacement.emit("open");
    relay.greet("greeting");
    assert.equal(replacement.sent.length, 0);
  } finally {
    relay.close("greeting");
  }
});

test("queues the greeting until the relay opens", () => {
  const { relay, socket } = setupGreetingRelay();
  socket.readyState = 0;
  relay.greet("greeting");
  assert.equal(socket.sent.length, 0);
  socket.readyState = 1;
  socket.emit("open");
  assert.equal(socket.sent.length, 1);
  relay.close("greeting");
});

test("does not introduce a late greeting after guest speech or an existing response", () => {
  for (const type of [
    "input_audio_buffer.speech_started",
    "response.created",
  ]) {
    const { relay, socket } = setupGreetingRelay();
    socket.emit("message", Buffer.from(JSON.stringify({ type })), false);
    relay.greet("greeting");
    assert.equal(socket.sent.length, 0);
    relay.close("greeting");
  }
});

test("passes the Gateway bearer to every relay connection without sending it as an event", () => {
  FakeRelaySocket.instances.length = 0;
  const relay = createAmaziEventRelay({
    authorizationToken: "gateway-secret",
    logger: silentLogger,
    service: {
      appendTranscriptByProvider: async () => null,
      toolForProviderCall: async () => ({
        accepted: false,
        reason: "test",
      }),
    },
    WebSocketClass: FakeRelaySocket as never,
  });

  relay.connect({
    eventRelayUrl: "wss://relay.example/session",
    providerCallId: "amazi:session-auth",
    sessionId: "session-auth",
  });

  const socket = FakeRelaySocket.instances[0];
  assert.ok(socket);
  assert.equal(socket.options?.headers?.Authorization, "Bearer gateway-secret");
  assert.deepEqual(socket.sent, []);
  assert.doesNotMatch(JSON.stringify(socket.sent), /gateway-secret/u);
  relay.close("session-auth");
});

test("retries a not-yet-registered relay session after a 404", async () => {
  FakeRelaySocket.instances.length = 0;
  const relay = createAmaziEventRelay({
    authorizationToken: "gateway-secret",
    logger: silentLogger,
    service: {
      appendTranscriptByProvider: async () => null,
      toolForProviderCall: async () => ({
        accepted: false,
        reason: "test",
      }),
    },
    WebSocketClass: FakeRelaySocket as never,
  });
  relay.connect({
    eventRelayUrl: "wss://relay.example/session",
    providerCallId: "amazi:session-404",
    sessionId: "session-404",
  });

  const first = FakeRelaySocket.instances[0];
  assert.ok(first);
  first.emit("unexpected-response", {}, { statusCode: 404 });
  await wait(300);

  assert.equal(FakeRelaySocket.instances.length, 2);
  assert.equal(
    FakeRelaySocket.instances[1]?.options?.headers?.Authorization,
    "Bearer gateway-secret",
  );
  assert.equal(relay.size(), 1);
  relay.close("session-404");
});

test("stops relay retries after an authentication response", async () => {
  FakeRelaySocket.instances.length = 0;
  const logs: unknown[] = [];
  const relay = createAmaziEventRelay({
    authorizationToken: "gateway-secret",
    logger: {
      error: (...args: unknown[]) => logs.push(args),
      warn: (...args: unknown[]) => logs.push(args),
    } as never,
    service: {
      appendTranscriptByProvider: async () => null,
      toolForProviderCall: async () => ({
        accepted: false,
        reason: "test",
      }),
    },
    WebSocketClass: FakeRelaySocket as never,
  });
  relay.connect({
    eventRelayUrl: "wss://relay.example/session",
    providerCallId: "amazi:session-401",
    sessionId: "session-401",
  });

  const socket = FakeRelaySocket.instances[0];
  assert.ok(socket);
  socket.emit("unexpected-response", {}, { statusCode: 401 });
  await wait(300);

  assert.equal(FakeRelaySocket.instances.length, 1);
  assert.doesNotMatch(JSON.stringify(logs), /gateway-secret/u);
  relay.close("session-401");
});

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
