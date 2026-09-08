import { createLogger } from "../../lib/logger.js";
import { fetchMangoRecording } from "./voice-agent.recording.js";
import type { VoiceAgentRepository } from "./voice-agent.repository.js";

const logger = createLogger();

export const transcribeMangoRecording = async ({
  mangoApiKey,
  callId,
  openaiBaseUrl,
  openaiApiKey,
  recordingId,
  repository,
  salt,
  fetchImpl = fetch,
}: {
  readonly mangoApiKey: string;
  readonly callId: string;
  readonly openaiBaseUrl: string;
  readonly openaiApiKey: string;
  readonly recordingId: string;
  readonly repository: VoiceAgentRepository;
  readonly salt: string;
  readonly fetchImpl?: typeof fetch;
}) => {
  const recording = await fetchMangoRecording({
    apiKey: mangoApiKey,
    fetchImpl,
    recordingId,
    salt,
  });
  const audio = Buffer.from(await recording.arrayBuffer());
  const contentType =
    recording.headers.get("content-type")?.split(";", 1)[0] ?? "audio/mpeg";
  const extension =
    contentType === "audio/wav" || contentType === "audio/x-wav"
      ? "wav"
      : contentType === "audio/ogg"
        ? "ogg"
        : contentType === "audio/mp4"
          ? "m4a"
          : "mp3";
  const form = new FormData();
  form.append(
    "file",
    new Blob([audio], { type: contentType }),
    `call-recording.${extension}`,
  );
  form.append("model", "gpt-4o-mini-transcribe");
  const response = await fetchImpl(
    `${openaiBaseUrl.replace(/\/$/u, "")}/audio/transcriptions`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiApiKey}` },
      body: form,
      signal: AbortSignal.timeout(60_000),
    },
  );
  if (!response.ok) {
    const details = (await response.text()).slice(0, 1_000);
    logger.error(
      {
        callId,
        contentType,
        recordingBytes: audio.byteLength,
        recordingId,
        status: response.status,
        details,
      },
      "Call transcription request failed",
    );
    throw new Error(`Call transcription failed with status ${response.status}`);
  }
  const result = (await response.json()) as { text?: string };
  const text = result.text?.trim();
  if (!text) throw new Error("Call transcription returned empty text");
  return repository.appendTranscript(callId, {
    role: "guest",
    text,
    providerEventId: `mango-recording:${recordingId}`,
  });
};
