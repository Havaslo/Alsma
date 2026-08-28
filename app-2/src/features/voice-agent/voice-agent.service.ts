import { createHash, randomUUID } from "node:crypto";

import type { Database } from "../../lib/database/database.js";
import { createLogger } from "../../lib/logger.js";
import type { EpteraClient } from "../booking/eptera.client.js";
import { formatEventsContext, listPublishedEvents } from "./events-context.js";
import { createMangoEventHandler } from "./voice-agent.lifecycle.js";
import type { MangoProviderEvent } from "./voice-agent.mango.js";
import type { VoiceAgentRepository } from "./voice-agent.repository.js";
import type {
  CreateCallBody,
  ToolBody,
  TranscriptBody,
} from "./voice-agent.schemas.js";
import { toolBodySchema } from "./voice-agent.schemas.js";

const logger = createLogger();

export const selectMangoTransferInitiator = (call: {
  readonly mangoTransferInitiator?: string | null;
  readonly callerPhone?: string | null;
}) => {
  if (
    call.mangoTransferInitiator === "from.number" ||
    call.mangoTransferInitiator === "to.number"
  )
    return call.mangoTransferInitiator;
  if (call.callerPhone) return "from.number";
  return undefined;
};

export const buildMangoTransferPayload = ({
  callId,
  destination,
  initiator,
}: {
  readonly callId: string;
  readonly destination: string;
  readonly initiator: "from.number" | "to.number";
}) => ({
  command_id: `alsma-transfer-${randomUUID()}`,
  call_id: callId,
  method: "blind",
  to_number: destination,
  initiator,
});

const transferMangoCall = async ({
  apiKey,
  callId,
  destination,
  initiator,
  salt,
}: {
  readonly apiKey: string;
  readonly callId: string;
  readonly destination: string;
  readonly initiator: "from.number" | "to.number";
  readonly salt: string;
}) => {
  const payload = buildMangoTransferPayload({ callId, destination, initiator });
  const commandId = payload.command_id;
  const json = JSON.stringify(payload);
  const sign = createHash("sha256")
    .update(`${apiKey}${json}${salt}`)
    .digest("hex");
  const response = await fetch(
    "https://app.mango-office.ru/vpbx/commands/transfer",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ vpbx_api_key: apiKey, sign, json }),
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!response.ok) throw new Error(`Mango API failed with ${response.status}`);
  const accepted = (await response.json()) as { result?: number | string };
  if (String(accepted.result ?? "") === "1000") return accepted;
  for (const delay of [500, 1_000, 2_000]) {
    await new Promise((resolve) => setTimeout(resolve, delay));
    const resultJson = JSON.stringify({ command_id: commandId });
    const resultSign = createHash("sha256")
      .update(`${apiKey}${resultJson}${salt}`)
      .digest("hex");
    const resultResponse = await fetch(
      "https://app.mango-office.ru/vpbx/result/transfer",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          vpbx_api_key: apiKey,
          sign: resultSign,
          json: resultJson,
        }),
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (!resultResponse.ok)
      throw new Error(`Mango result API failed with ${resultResponse.status}`);
    const result = (await resultResponse.json()) as {
      result?: number | string;
    };
    if (String(result.result ?? "") === "1000") return result;
    if (result.result && String(result.result) !== "0")
      throw new Error(`Mango transfer rejected with ${String(result.result)}`);
  }
  throw new Error("Mango transfer result timed out");
};

const parseJson = (value: string) => {
  try {
    return JSON.parse(value) as {
      summary?: string;
      intent?: string;
      extracted?: Record<string, unknown>;
    };
  } catch {
    return {};
  }
};

export const createVoiceAgentService = (
  repository: VoiceAgentRepository,
  database: Database,
  apiKey?: string,
  openaiBaseUrl?: string,
  eptera?: EpteraClient,
  transfer?: {
    readonly mangoApiKey?: string;
    readonly mangoApiSalt?: string;
    readonly destination?: string;
    readonly openaiSipApiKey?: string;
    readonly openaiSipBaseUrl?: string;
  },
) => {
  const isVoiceEnabled = async () => {
    const setting = await repository.getAgentSettings();
    const value = setting as Record<string, unknown> | null | undefined;
    return !(value && value.voice === false);
  };
  const completeWithOpenAI = async (prompt: string, json = false) => {
    if (!apiKey || !openaiBaseUrl)
      throw new Error("OpenAI AI Gateway is not configured");
    const response = await fetch(
      `${openaiBaseUrl.replace(/\/$/u, "")}/chat/completions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-5.4-mini",
          temperature: 0.2,
          response_format: json ? { type: "json_object" } : undefined,
          messages: [
            {
              role: "system",
              content:
                "Ответь только на основе переданного ниже контекста; не добавляй неподтверждённые факты.",
            },
            { role: "user", content: prompt },
          ],
        }),
        signal: AbortSignal.timeout(30_000),
      },
    );
    if (!response.ok)
      throw new Error(`OpenAI request failed with status ${response.status}`);
    const body = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return (
      body.choices?.[0]?.message?.content?.trim() ??
      "Не удалось получить ответ."
    );
  };

  const completeCallForId = async (
    id: string,
    outcome?: string,
    recordingUrl?: string,
    recordingObjectId?: string,
  ) => {
    const call = await repository.findCall(id);
    if (!call) return null;
    const transcript = JSON.stringify(call.transcript);
    const result = parseJson(
      await completeWithOpenAI(
        `Проанализируй транскрипцию звонка и верни JSON с полями summary (краткое резюме на русском), intent (намерение), extracted (имя, телефон, даты, гости, тип номера, услуги, пожелания — только найденные поля). Транскрипция: ${transcript}`,
        true,
      ),
    );
    return repository.completeCall(id, {
      outcome,
      recordingUrl,
      recordingObjectId,
      summary: result.summary ?? "Резюме не сформировано.",
      intent: result.intent ?? "unknown",
      extracted: result.extracted ?? {},
    });
  };

  const mangoEventHandler = createMangoEventHandler({
    completeCall: completeCallForId,
    repository,
  });

  const transferToManager = async (callId: string, reason: string) => {
    const call = await repository.findCall(callId);
    if (call?.status === "transferring" || call?.status === "completed")
      return { accepted: true, duplicate: true };
    const transferFailure = (reason: string) => ({
      accepted: false as const,
      message:
        "Не удалось соединить вас с менеджером. Пожалуйста, оставайтесь на линии или позвоните позднее.",
      reason,
    });
    if (!call || !transfer?.destination)
      return transferFailure("transfer_not_configured");
    if (!transfer.mangoApiKey || !transfer.mangoApiSalt)
      return transferFailure("transfer_not_configured");
    const mangoCallId =
      call.mangoCallId ??
      (call.provider === "mango" ? call.providerCallId : undefined);
    const initiator = selectMangoTransferInitiator(call);
    if (!mangoCallId) return transferFailure("mango_call_id_missing");
    if (!initiator) return transferFailure("mango_transfer_initiator_missing");

    const claimed = await repository.claimTransfer(
      callId,
      `transfer_requested:${reason}`,
    );
    if (!claimed) return { accepted: true, duplicate: true };

    try {
      await transferMangoCall({
        apiKey: transfer.mangoApiKey,
        callId: mangoCallId,
        destination: transfer.destination,
        initiator,
        salt: transfer.mangoApiSalt,
      });
      return { accepted: true };
    } catch (error) {
      logger.warn(
        {
          stage: "mango_transfer",
          outcome: "failed",
          errorCode:
            error instanceof Error && error.message.includes("timed out")
              ? "mango_transfer_timeout"
              : "mango_transfer_rejected",
        },
        "Voice transfer failed",
      );
      await repository
        .failTransfer(callId, "transfer_failed")
        .catch(() => undefined);
      return transferFailure("transfer_failed");
    }
  };

  const executeTool = async (input: ToolBody) => {
    if (input.name === "get_events") {
      try {
        const events = await listPublishedEvents(database, input.date);
        return {
          events: events.map((event) => ({ ...event })),
          context: formatEventsContext(events),
        };
      } catch {
        return { events: [], reason: "events_temporarily_unavailable" };
      }
    }
    if (input.name === "knowledge_answer")
      return {
        answer: await (async () => {
          if (!(await isVoiceEnabled()))
            return "Сейчас голосовой AI-агент временно недоступен.";
          const knowledge = await repository.getKnowledgeContext();
          return completeWithOpenAI(
            `Вопрос гостя: ${input.question}\n\nБаза знаний:\n${knowledge}`,
          );
        })(),
      };
    if (input.name === "create_booking_request") {
      const request = await repository.createRequestForCall(
        input.callId,
        input.extracted,
        input.comment ? [{ role: "guest", text: input.comment }] : [],
      );
      return { requestId: request.id, accepted: true };
    }
    if (input.name === "check_availability") {
      if (!eptera)
        return { available: false, reason: "availability_not_configured" };
      return eptera.checkAvailability({
        adults: input.adults,
        checkIn: input.checkIn,
        checkOut: input.checkOut,
        children: input.children,
        roomCount: input.roomCount,
      });
    }
    return transferToManager(input.callId, input.reason);
  };

  return {
    testAudioTurn: async (audioBase64: string, mimeType: string) => {
      if (!apiKey || !openaiBaseUrl)
        throw new Error("OpenAI AI Gateway is not configured");
      const audio = Buffer.from(audioBase64, "base64");
      const form = new FormData();
      form.append("file", new Blob([audio], { type: mimeType }), "turn.webm");
      form.append("model", "gpt-4o-mini-transcribe");
      const transcriptionResponse = await fetch(
        `${openaiBaseUrl.replace(/\/$/u, "")}/audio/transcriptions`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}` },
          body: form,
          signal: AbortSignal.timeout(30_000),
        },
      );
      if (!transcriptionResponse.ok)
        throw new Error(
          `Audio transcription failed with status ${transcriptionResponse.status}`,
        );
      const transcription = (await transcriptionResponse.json()) as {
        text?: string;
      };
      const text = transcription.text?.trim();
      if (!text)
        throw new Error("The audio did not contain recognizable speech");
      const answer = await (async () => {
        const knowledge = await repository.getKnowledgeContext();
        return completeWithOpenAI(
          `Вопрос гостя: ${text}\n\nБаза знаний и правила:\n${knowledge}`,
        );
      })();
      const speechResponse = await fetch(
        `${openaiBaseUrl.replace(/\/$/u, "")}/audio/speech`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            input: answer,
            model: "gpt-4o-mini-tts",
            response_format: "mp3",
            voice: "marin",
          }),
          signal: AbortSignal.timeout(30_000),
        },
      );
      if (!speechResponse.ok)
        throw new Error(
          `Audio speech failed with status ${speechResponse.status}`,
        );
      return {
        answer,
        audioBase64: Buffer.from(await speechResponse.arrayBuffer()).toString(
          "base64",
        ),
        audioMimeType: "audio/mpeg",
        transcript: text,
      };
    },
    createCall: async (input: CreateCallBody) => ({
      ...(await repository.createCall(input)),
    }),
    appendTranscript: (id: string, segment: TranscriptBody) =>
      repository.appendTranscript(id, segment),
    answer: async (question: string, callId?: string) => {
      if (!(await isVoiceEnabled()))
        return {
          answer: "Сейчас голосовой AI-агент временно недоступен.",
          callId,
        };
      const knowledge = await repository.getKnowledgeContext();
      const answer = await completeWithOpenAI(
        `Вопрос гостя: ${question}\n\nБаза знаний и правила:\n${knowledge}`,
      );
      return { answer, callId };
    },
    completeCall: completeCallForId,
    handleMangoWebhook: async (providerEvent: MangoProviderEvent) => {
      const claimed = await repository.claimWebhookEvent({
        callId:
          providerEvent.kind === "call" || providerEvent.kind === "recording"
            ? providerEvent.event.call_id
            : undefined,
        entryId:
          providerEvent.kind === "normalized"
            ? undefined
            : providerEvent.event.entry_id,
        eventKey: providerEvent.eventKey,
        provider: "mango",
        sequence:
          providerEvent.kind === "call" || providerEvent.kind === "recording"
            ? providerEvent.event.seq
            : undefined,
      });
      if (!claimed) return { received: true, duplicate: true };

      try {
        return await mangoEventHandler.handle(providerEvent);
      } catch (error) {
        await repository
          .releaseWebhookEvent(providerEvent.eventKey)
          .catch(() => undefined);
        throw error;
      }
    },
    ensureProviderCall: (input: {
      callerPhone?: string;
      provider: string;
      providerCallId: string;
    }) => repository.ensureCall(input),
    appendTranscriptByProvider: async (
      providerCallId: string,
      segment: TranscriptBody,
    ) => {
      const call = await repository.findByProviderCallId(providerCallId);
      return call ? repository.appendTranscript(call.id, segment) : null;
    },
    completeCallByProvider: async (
      providerCallId: string,
      outcome?: string,
      recordingUrl?: string,
      recordingObjectId?: string,
    ) => {
      const call = await repository.findByProviderCallId(providerCallId);
      return call
        ? completeCallForId(call.id, outcome, recordingUrl, recordingObjectId)
        : null;
    },
    toolForProviderCall: async (
      providerCallId: string,
      name: string,
      args: unknown,
    ) => {
      const call = await repository.findByProviderCallId(providerCallId);
      if (!call) return { accepted: false, reason: "call_not_found" };
      const parsed = toolBodySchema.safeParse({
        ...(args && typeof args === "object" ? args : {}),
        callId: call.id,
        name,
      });
      if (!parsed.success)
        return { accepted: false, reason: "invalid_tool_arguments" };
      return executeTool(parsed.data);
    },
    tool: executeTool,
  };
};

export type VoiceAgentService = ReturnType<typeof createVoiceAgentService>;
