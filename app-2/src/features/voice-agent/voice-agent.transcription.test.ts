import assert from "node:assert/strict";
import test from "node:test";

import type { VoiceAgentRepository } from "./voice-agent.repository.js";
import { transcribeMangoRecording } from "./voice-agent.transcription.js";

test("uses separate Mango and OpenAI credentials for recording transcription", async () => {
  const requests: Array<{ input: string; init?: RequestInit }> = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    requests.push({ input: String(input), init });
    if (requests.length === 1)
      return new Response(null, {
        status: 302,
        headers: { location: "https://files.mango-office.ru/recording" },
      });
    if (requests.length === 2)
      return new Response(new Uint8Array([1, 2, 3]), {
        headers: { "content-type": "audio/mpeg" },
      });
    return new Response(JSON.stringify({ text: "Здравствуйте" }), {
      headers: { "content-type": "application/json" },
    });
  };
  const repository = {
    appendTranscript: async (_callId: string, segment: unknown) => segment,
  } as unknown as VoiceAgentRepository;

  await transcribeMangoRecording({
    callId: "call-1",
    fetchImpl,
    mangoApiKey: "mango-secret",
    openaiApiKey: "openai-secret",
    openaiBaseUrl: "https://gateway.example.test/v1",
    recordingId: "recording-1",
    repository,
    salt: "mango-salt",
  });

  const mangoBody = String(requests[0]?.init?.body);
  assert.match(mangoBody, /mango-secret/u);
  const gatewayRequest = requests[2];
  assert.ok(gatewayRequest);
  assert.equal(
    new Headers(gatewayRequest.init?.headers).get("Authorization"),
    "Bearer openai-secret",
  );
  assert.doesNotMatch(String(gatewayRequest.init?.headers), /mango-secret/u);
});

test("stores diarized turns as assistant and guest segments", async () => {
  const segments: Array<{ role?: string; text?: string }> = [];
  let requestCount = 0;
  const fetchImpl: typeof fetch = async (_input, init) => {
    requestCount += 1;
    if (requestCount === 1)
      return new Response(null, {
        status: 302,
        headers: { location: "https://files.mango-office.ru/recording" },
      });
    if (requestCount === 2)
      return new Response(new Uint8Array([1, 2, 3]), {
        headers: { "content-type": "audio/mpeg" },
      });
    const body = new FormData();
    for (const [key, value] of (init?.body as FormData).entries())
      body.append(key, value);
    assert.equal(body.get("model"), "gpt-4o-transcribe-diarize");
    assert.equal(body.get("response_format"), "diarized_json");
    assert.equal(body.get("chunking_strategy"), "auto");
    return new Response(
      JSON.stringify({
        segments: [
          { end: 1, speaker: "A", start: 0, text: "Здравствуйте" },
          { end: 2, speaker: "B", start: 1, text: "Добрый день" },
        ],
      }),
      { headers: { "content-type": "application/json" } },
    );
  };
  const repository = {
    appendTranscript: async (
      _callId: string,
      segment: { role?: string; text?: string },
    ) => {
      segments.push(segment);
      return segment;
    },
    replaceTranscript: async () => null,
  } as unknown as VoiceAgentRepository;

  await transcribeMangoRecording({
    callId: "call-1",
    fetchImpl,
    mangoApiKey: "mango-secret",
    openaiApiKey: "openai-secret",
    openaiBaseUrl: "https://gateway.example.test/v1",
    recordingId: "recording-1",
    repository,
    salt: "mango-salt",
  });

  assert.deepEqual(
    segments.map((segment) => segment.role),
    ["assistant", "guest"],
  );
});

test("falls back through plain STT models and stores one neutral segment", async () => {
  const requests: string[] = [];
  let mangoCalls = 0;
  const segments: Array<{ role?: string; text?: string }> = [];
  const fetchImpl: typeof fetch = async (_input, init) => {
    mangoCalls += 1;
    if (mangoCalls === 1)
      return new Response(null, {
        status: 302,
        headers: { location: "https://files.mango-office.ru/recording" },
      });
    if (mangoCalls === 2)
      return new Response(new Uint8Array([1]), {
        headers: { "content-type": "audio/mpeg" },
      });
    const body = init?.body as FormData;
    requests.push(String(body.get("model")));
    if (requests.length <= 3)
      return new Response(
        JSON.stringify({ error: { code: "MODEL_UNAVAILABLE" } }),
        {
          status: 404,
        },
      );
    assert.equal(body.get("response_format"), "json");
    return new Response(JSON.stringify({ text: "Обычная расшифровка" }));
  };
  const repository = {
    appendTranscript: async (
      _callId: string,
      segment: { role?: string; text?: string },
    ) => {
      segments.push(segment);
      return segment;
    },
    replaceTranscript: async () => null,
  } as unknown as VoiceAgentRepository;

  await transcribeMangoRecording({
    callId: "call-1",
    fetchImpl,
    mangoApiKey: "mango-secret",
    openaiApiKey: "openai-secret",
    openaiBaseUrl: "https://gateway.example.test/v1",
    recordingId: "recording-1",
    repository,
    salt: "mango-salt",
  });

  assert.deepEqual(requests, [
    "gpt-4o-transcribe-diarize",
    "gpt-4o-transcribe",
    "gpt-4o-mini-transcribe",
    "whisper-1",
  ]);
  assert.deepEqual(segments, [
    {
      role: "guest",
      text: "Обычная расшифровка",
      providerEventId: "mango-recording:recording-1:plain",
    },
  ]);
});

test("does not call STT when Mango recording download fails", async () => {
  let calls = 0;
  const fetchImpl: typeof fetch = async () => {
    calls += 1;
    if (calls === 1)
      return new Response(null, {
        status: 302,
        headers: { location: "https://files.mango-office.ru/recording" },
      });
    return new Response(null, { status: 503 });
  };
  await assert.rejects(
    () =>
      transcribeMangoRecording({
        callId: "call-1",
        fetchImpl,
        mangoApiKey: "mango-secret",
        openaiApiKey: "openai-secret",
        openaiBaseUrl: "https://gateway.example.test/v1",
        recordingId: "recording-1",
        repository: {} as VoiceAgentRepository,
        salt: "mango-salt",
      }),
    (error: unknown) =>
      error instanceof Error && error.name === "MangoTranscriptionError",
  );
  assert.equal(calls, 2);
});
