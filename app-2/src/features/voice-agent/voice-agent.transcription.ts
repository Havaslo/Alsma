import { createLogger } from "../../lib/logger.js";
import { fetchMangoRecording } from "./voice-agent.recording.js";
import type { VoiceAgentRepository } from "./voice-agent.repository.js";

type DiarizedSegment = {
  readonly end?: number;
  readonly speaker?: string;
  readonly start?: number;
  readonly text?: string;
};

type DiarizedResponse = {
  readonly segments?: DiarizedSegment[];
  readonly text?: string;
};

const speakerRole = (speaker: string, speakers: string[]) => {
  const index = speakers.indexOf(speaker);
  if (index === 0) return "assistant" as const;
  if (index === 1) return "guest" as const;
  return index === 2 ? "speaker_2" : "speaker_3";
};

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
  form.append("model", "gpt-4o-transcribe-diarize");
  form.append("response_format", "diarized_json");
  form.append("chunking_strategy", "auto");
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
  const result = (await response.json()) as DiarizedResponse;
  const segments = (result.segments ?? []).filter(
    (segment): segment is DiarizedSegment & { speaker: string; text: string } =>
      Boolean(segment.speaker && segment.text?.trim()),
  );
  if (segments.length === 0) {
    const text = result.text?.trim();
    if (!text) throw new Error("Call transcription returned empty text");
    return repository.appendTranscript(callId, {
      role: "guest",
      text,
      providerEventId: `mango-recording:${recordingId}`,
    });
  }
  const speakers = [...new Set(segments.map((segment) => segment.speaker))];
  if ("replaceTranscript" in repository)
    await repository.replaceTranscript(callId);
  let lastResult: unknown = null;
  for (const [index, segment] of segments.entries()) {
    lastResult = await repository.appendTranscript(callId, {
      endedAt:
        segment.end === undefined
          ? undefined
          : new Date(Date.now() + segment.end * 1_000).toISOString(),
      role: speakerRole(segment.speaker, speakers),
      startedAt:
        segment.start === undefined
          ? undefined
          : new Date(Date.now() + segment.start * 1_000).toISOString(),
      text: segment.text.trim(),
      providerEventId: `mango-recording:${recordingId}:segment:${index}`,
    });
  }
  return lastResult;
};
