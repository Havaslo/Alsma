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
      toolForProviderCall: async () => ({
        accepted: false,
        reason: "unsupported_tool",
      }),
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

test("rejects retired manager-transfer events without calling the tool service", async () => {
  FakeRelaySocket.instances.length = 0;
  let serviceCalls = 0;
  const relay = createAmaziEventRelay({
    service: {
      appendTranscriptByProvider: async () => null,
      toolForProviderCall: async () => {
        serviceCalls += 1;
        return { accepted: false, reason: "invalid_tool_arguments" };
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
  assert.equal(serviceCalls, 0);
  assert.equal(FakeRelaySocket.instances.length, 1);
  assert.match(socket.sent.join("\n"), /unsupported_tool/u);
  relay.close("session-1");
});

test("gives a short Russian spoken fallback when Eptera is unavailable", async () => {
  FakeRelaySocket.instances.length = 0;
  const relay = createAmaziEventRelay({
    service: {
      appendTranscriptByProvider: async () => null,
      toolForProviderCall: async () => ({
        available: false,
        readOnly: true,
        reason: "eptera_temporarily_unavailable",
      }),
    },
    WebSocketClass: FakeRelaySocket as never,
  });
  relay.connect({
    eventRelayUrl: "wss://relay.example/session",
    providerCallId: "amazi:eptera-unavailable",
    sessionId: "eptera-unavailable",
  });
  const socket = FakeRelaySocket.instances[0]!;
  socket.emit("open");
  socket.emit(
    "message",
    Buffer.from(
      JSON.stringify({
        type: "response.function_call_arguments.done",
        call_id: "availability-check-1",
        name: "check_availability",
        arguments: JSON.stringify({
          checkIn: "2026-10-13",
          checkOut: "2026-10-15",
          adults: 1,
        }),
      }),
    ),
    false,
  );
  await new Promise((resolve) => setImmediate(resolve));
  const response = socket.sent
    .map((message) => JSON.parse(message) as Record<string, unknown>)
    .find((message) => message.type === "response.create");
  assert.ok(response);
  const responseConfig = response.response as {
    instructions?: string;
    tool_choice?: string;
  };
  assert.equal(responseConfig.tool_choice, "none");
  assert.match(responseConfig.instructions ?? "", /только по-русски/u);
  assert.match(
    responseConfig.instructions ?? "",
    /не получается проверить наличие номеров/u,
  );
  relay.close("eptera-unavailable");
});

test("persists clean output audio when the relay closes", async () => {
  FakeRelaySocket.instances.length = 0;
  const persisted: Array<{
    pcm: Uint8Array;
    providerCallId: string;
    truncated: boolean;
  }> = [];
  const relay = createAmaziEventRelay({
    persistOutputAudio: async (input) => {
      persisted.push(input);
    },
    service: {
      appendTranscriptByProvider: async () => null,
      toolForProviderCall: async () => ({
        accepted: true,
        requestId: "request-id",
        status: "pending",
      }),
    },
    WebSocketClass: FakeRelaySocket as never,
  });
  relay.connect({
    eventRelayUrl: "wss://relay.example/session",
    providerCallId: "amazi:session-clean-audio",
    sessionId: "session-clean-audio",
  });
  const socket = FakeRelaySocket.instances[0]!;
  socket.emit(
    "message",
    Buffer.from(
      JSON.stringify({
        delta: Buffer.from([1, 2, 3, 4]).toString("base64"),
        type: "response.output_audio.delta",
      }),
    ),
    false,
  );

  relay.close("session-clean-audio");
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(persisted.length, 1);
  assert.equal(persisted[0]?.providerCallId, "amazi:session-clean-audio");
  assert.equal(persisted[0]?.truncated, false);
  assert.deepEqual(
    Buffer.from(persisted[0]?.pcm ?? []),
    Buffer.from([1, 2, 3, 4]),
  );
});

test("attempts one safe Russian fallback after a Realtime response failure", () => {
  FakeRelaySocket.instances.length = 0;
  const warnings: unknown[] = [];
  const relay = createAmaziEventRelay({
    logger: {
      error: (...args: unknown[]) => warnings.push(args),
      warn: (...args: unknown[]) => warnings.push(args),
    } as never,
    service: {
      appendTranscriptByProvider: async () => null,
      toolForProviderCall: async () => ({
        accepted: true,
        requestId: "request-id",
        status: "pending",
      }),
    },
    WebSocketClass: FakeRelaySocket as never,
  });
  relay.connect({
    eventRelayUrl: "wss://relay.example/session",
    providerCallId: "amazi:response-failure",
    sessionId: "response-failure",
  });
  const socket = FakeRelaySocket.instances[0]!;
  const failedEvent = JSON.stringify({
    event_id: "event-failed",
    response: {
      id: "response-failed",
      status: "failed",
      status_details: {
        error: {
          code: "server_error",
          message: "sensitive-provider-detail",
          type: "server_error",
        },
      },
    },
    type: "response.done",
  });
  socket.emit("message", Buffer.from(failedEvent), false);
  socket.emit("message", Buffer.from(failedEvent), false);

  const responses = socket.sent
    .map((message) => JSON.parse(message) as Record<string, unknown>)
    .filter((message) => message.type === "response.create");
  assert.equal(responses.length, 1);
  const fallback = responses[0]?.response as {
    instructions?: string;
    output_modalities?: string[];
    tool_choice?: string;
  };
  assert.deepEqual(fallback.output_modalities, ["audio"]);
  assert.equal(fallback.tool_choice, "none");
  assert.match(fallback.instructions ?? "", /только по-русски/u);
  assert.match(fallback.instructions ?? "", /перезвоните позже/u);
  assert.doesNotMatch(JSON.stringify(warnings), /sensitive-provider-detail/u);
  assert.match(JSON.stringify(warnings), /server_error/u);
  relay.close("response-failure");
});

test("uses a safe Russian fallback for a retryable Gateway error", () => {
  FakeRelaySocket.instances.length = 0;
  const warnings: unknown[] = [];
  const relay = createAmaziEventRelay({
    logger: {
      error: (...args: unknown[]) => warnings.push(args),
      warn: (...args: unknown[]) => warnings.push(args),
    } as never,
    service: {
      appendTranscriptByProvider: async () => null,
      toolForProviderCall: async () => ({
        accepted: true,
        requestId: "request-id",
        status: "pending",
      }),
    },
    WebSocketClass: FakeRelaySocket as never,
  });
  relay.connect({
    eventRelayUrl: "wss://relay.example/session",
    providerCallId: "amazi:gateway-failure",
    sessionId: "gateway-failure",
  });
  const socket = FakeRelaySocket.instances[0]!;
  socket.emit(
    "message",
    Buffer.from(
      JSON.stringify({
        type: "amazi.gateway.error",
        error: {
          code: "gateway_unavailable",
          message: "sensitive-provider-detail",
          requestId: "request-123",
          retryable: true,
          stage: "provider",
        },
      }),
    ),
    false,
  );

  const responses = socket.sent
    .map((message) => JSON.parse(message) as Record<string, unknown>)
    .filter((message) => message.type === "response.create");
  assert.equal(responses.length, 1);
  const fallback = responses[0]?.response as { instructions?: string };
  assert.match(fallback.instructions ?? "", /только по-русски/u);
  assert.match(fallback.instructions ?? "", /обратитесь к администратору/u);
  assert.match(JSON.stringify(warnings), /gateway_unavailable/u);
  assert.match(JSON.stringify(warnings), /request-123/u);
  assert.match(JSON.stringify(warnings), /provider/u);
  assert.doesNotMatch(JSON.stringify(warnings), /sensitive-provider-detail/u);
  relay.close("gateway-failure");
});

test("does not speak a failure fallback for a cancelled response", () => {
  const { relay, socket } = setupGreetingRelay();
  socket.emit(
    "message",
    Buffer.from(
      JSON.stringify({
        response: { status: "cancelled" },
        type: "response.done",
      }),
    ),
    false,
  );
  assert.deepEqual(socket.sent, []);
  relay.close("greeting");
});
