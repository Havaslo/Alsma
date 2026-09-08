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
