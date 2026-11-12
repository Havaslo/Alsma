import assert from "node:assert/strict";
import test from "node:test";

import {
  MangoRecordingError,
  fetchMangoRecording,
} from "./voice-agent.recording.js";
import { transcriptSegmentId } from "./voice-agent.repository.js";

test("transcript segment identity is stable for repeated provider events", () => {
  const segment = {
    role: "guest" as const,
    text: "Здравствуйте",
    providerEventId: "provider-item-1",
  };
  assert.equal(
    transcriptSegmentId("call", segment),
    transcriptSegmentId("call", segment),
  );
  assert.notEqual(
    transcriptSegmentId("call", segment),
    transcriptSegmentId("other-call", segment),
  );
});

test("recording proxy rejects non-Mango redirects", async () => {
  const fetchImpl: typeof fetch = async (input) => {
    if (typeof input === "string")
      return new Response(
        JSON.stringify({ url: "https://example.test/audio" }),
        {
          headers: { "content-type": "application/json" },
        },
      );
    return new Response("unexpected");
  };
  await assert.rejects(
    fetchMangoRecording({
      apiKey: "key",
      recordingId: "recording",
      salt: "salt",
      fetchImpl,
    }),
    /unsafe recording URL/u,
  );
});

test("recording proxy surfaces the provider refusal reason", async () => {
  const fetchImpl: typeof fetch = async () =>
    new Response(
      JSON.stringify({
        name: "Unauthorized",
        message: "Service disabled",
        code: 0,
        status: 401,
      }),
      { status: 401, headers: { "content-type": "application/json" } },
    );
  await assert.rejects(
    fetchMangoRecording({
      apiKey: "key",
      recordingId: "recording",
      salt: "salt",
      fetchImpl,
    }),
    (error: unknown) => {
      assert.ok(error instanceof MangoRecordingError);
      assert.equal(error.code, "http_401");
      assert.match(error.detail ?? "", /Service disabled/u);
      return true;
    },
  );
});

test("recording proxy reports an unreachable Mango API", async () => {
  const cause = Object.assign(
    new Error("getaddrinfo ENOTFOUND app.mango-office.ru"),
    {
      code: "ENOTFOUND",
    },
  );
  const fetchImpl: typeof fetch = async () => {
    throw new TypeError("fetch failed", { cause });
  };
  await assert.rejects(
    fetchMangoRecording({
      apiKey: "key",
      recordingId: "recording",
      salt: "salt",
      fetchImpl,
    }),
    (error: unknown) => {
      assert.ok(error instanceof MangoRecordingError);
      assert.equal(error.code, "request_failed");
      assert.match(error.detail ?? "", /ENOTFOUND/u);
      return true;
    },
  );
});

test("recording proxy follows a trusted temporary redirect without returning it", async () => {
  const requests: string[] = [];
  const fetchImpl: typeof fetch = async (input) => {
    requests.push(String(input));
    if (requests.length === 1)
      return new Response(null, {
        status: 302,
        headers: { location: "https://files.mango-office.ru/audio" },
      });
    return new Response(new Uint8Array([1, 2, 3]), {
      headers: { "content-type": "audio/mpeg" },
    });
  };
  const response = await fetchMangoRecording({
    apiKey: "key",
    recordingId: "recording",
    salt: "salt",
    fetchImpl,
  });
  assert.equal((await response.arrayBuffer()).byteLength, 3);
  assert.equal(requests.length, 2);
});
