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

type PlainResponse = { readonly text?: string };
type GatewayAttempt = {
  readonly model: string;
  readonly status?: number;
  readonly code?: string;
  readonly requestId?: string;
};

const diarizationModel = "gpt-4o-transcribe-diarize";
const fallbackModels = [
  "gpt-4o-transcribe",
  "gpt-4o-mini-transcribe",
  "whisper-1",
] as const;

const speakerRole = (speaker: string, speakers: string[]) => {
  const index = speakers.indexOf(speaker);
  if (index === 0) return "assistant" as const;
  if (index === 1) return "guest" as const;
  return index === 2 ? "speaker_2" : "speaker_3";
};

const logger = createLogger();

export type TranscriptionFailureStage =
  "mango_recording" | "gateway" | "result";

export class MangoTranscriptionError extends Error {
  constructor(
    message: string,
    readonly stage: TranscriptionFailureStage,
    readonly providerCode?: string,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = "MangoTranscriptionError";
  }
}

const gatewayErrorDetails = async (response: Response) => {
  const body = (await response.text()).slice(0, 2_000);
  try {
    const parsed = JSON.parse(body) as {
      error?: {
        code?: unknown;
        message?: unknown;
        requestId?: unknown;
        stage?: unknown;
      };
    };
    return {
      code:
        typeof parsed.error?.code === "string" ? parsed.error.code : undefined,
      message:
        typeof parsed.error?.message === "string"
          ? parsed.error.message
          : undefined,
      requestId:
        typeof parsed.error?.requestId === "string"
          ? parsed.error.requestId
          : undefined,
      stage:
        typeof parsed.error?.stage === "string"
          ? parsed.error.stage
          : undefined,
    };
  } catch {
    return { message: body.replace(/\s+/gu, " ").trim() || undefined };
  }
};

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
  let recording: Response;
  try {
    recording = await fetchMangoRecording({
      apiKey: mangoApiKey,
      fetchImpl,
      recordingId,
      salt,
    });
  } catch (error) {
    logger.warn(
      {
        callId,
        recordingId,
        error: error instanceof Error ? error.message : "unknown",
      },
      "Mango recording fetch failed during transcription",
    );
    throw new MangoTranscriptionError(
      "Mango recording could not be fetched",
      "mango_recording",
    );
  }
  let audio: Buffer;
  try {
    audio = Buffer.from(await recording.arrayBuffer());
  } catch (error) {
    logger.warn(
      {
        callId,
        recordingId,
        error: error instanceof Error ? error.message : "unknown",
      },
      "Mango recording body could not be read during transcription",
    );
    throw new MangoTranscriptionError(
      "Mango recording could not be read",
      "mango_recording",
    );
  }
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
  const endpoint = `${openaiBaseUrl.replace(/\/$/u, "")}/audio/transcriptions`;
  const attempts: GatewayAttempt[] = [];
  const request = async (model: string, responseFormat: string) => {
    const form = new FormData();
    form.append(
      "file",
      new Blob(
        [
          audio.buffer.slice(
            audio.byteOffset,
            audio.byteOffset + audio.byteLength,
          ) as ArrayBuffer,
        ],
        { type: contentType },
      ),
      `call-recording.${extension}`,
    );
    form.append("model", model);
    form.append("response_format", responseFormat);
    if (model === diarizationModel) form.append("chunking_strategy", "auto");
    try {
      const response = await fetchImpl(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${openaiApiKey}` },
        body: form,
        signal: AbortSignal.timeout(60_000),
      });
      if (response.ok) return response;
      const details = await gatewayErrorDetails(response);
      attempts.push({
        model,
        status: response.status,
        code: details.code,
        requestId: details.requestId,
      });
      logger.warn(
        { callId, model, status: response.status, details },
        "Call transcription model request failed; trying next model",
      );
      return undefined;
    } catch (error) {
      attempts.push({
        model,
        code: error instanceof Error ? error.name : "request_error",
      });
      logger.warn(
        {
          callId,
          model,
          error: error instanceof Error ? error.message : "unknown",
        },
        "Call transcription model request errored; trying next model",
      );
      return undefined;
    }
  };

  let response = await request(diarizationModel, "diarized_json");
  let usedFallback = false;
  if (!response) {
    usedFallback = true;
    for (const model of fallbackModels) {
      response = await request(model, "json");
      if (response) break;
    }
  }
  if (!response) {
    const last = attempts.at(-1);
    throw new MangoTranscriptionError(
      `Call transcription failed after ${attempts.length} STT model attempts`,
      "gateway",
      attempts
        .map(
          ({ model, status, code }) => `${model}:${status ?? code ?? "error"}`,
        )
        .join(","),
      last?.requestId,
    );
  }
  const result = (await response.json()) as DiarizedResponse & PlainResponse;
  if (usedFallback) {
    const text = result.text?.trim();
    if (!text)
      throw new MangoTranscriptionError(
        "Call transcription returned empty text from fallback model",
        "result",
      );
    if ("replaceTranscript" in repository)
      await repository.replaceTranscript(callId);
    return repository.appendTranscript(callId, {
      role: "guest",
      text,
      providerEventId: `mango-recording:${recordingId}:plain`,
    });
  }
  const segments = (result.segments ?? []).filter(
    (segment): segment is DiarizedSegment & { speaker: string; text: string } =>
      Boolean(segment.speaker && segment.text?.trim()),
  );
  if (segments.length === 0) {
    const text = result.text?.trim();
    if (!text)
      throw new MangoTranscriptionError(
        "Call transcription returned empty text",
        "result",
      );
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
