import { randomUUID } from "node:crypto";

import type { Database } from "../../lib/database/database.js";
import { createLogger } from "../../lib/logger.js";
import type { EpteraClient } from "../booking/eptera.client.js";
import { formatEventsContext, listPublishedEvents } from "./events-context.js";
import { createAmaziLifecycle } from "./voice-agent.amazi.lifecycle.js";
import { createVoiceTestAudioTurn } from "./voice-agent.audio.js";
import { createMangoEventHandler } from "./voice-agent.lifecycle.js";
import type { MangoProviderEvent } from "./voice-agent.mango.js";
import type { VoiceAgentRepository } from "./voice-agent.repository.js";
import type {
  CreateCallBody,
  ToolBody,
  TranscriptBody,
} from "./voice-agent.schemas.js";
import { toolBodySchema } from "./voice-agent.schemas.js";
import { transcribeMangoRecording } from "./voice-agent.transcription.js";
import {
  MangoTransferError,
  isTimeoutError,
  selectMangoTransferInitiator,
  transferMangoCall,
} from "./voice-agent.transfer.js";

export {
  MangoTransferError,
  buildMangoTransferPayload,
  selectMangoTransferInitiator,
  transferMangoCall,
} from "./voice-agent.transfer.js";

const logger = createLogger();

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
    const transcriptItems = Array.isArray(call.transcript)
      ? call.transcript
      : [];
    if (transcriptItems.length === 0)
      return repository.completeCall(id, {
        outcome,
        recordingUrl,
        recordingObjectId,
        extracted: {},
      });
    const transcript = JSON.stringify(transcriptItems);
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
    ...(apiKey &&
    openaiBaseUrl &&
    transfer?.mangoApiKey &&
    transfer.mangoApiSalt
      ? {
          transcribeRecording: async ({ callId, recordingId }) => {
            await transcribeMangoRecording({
              mangoApiKey: transfer.mangoApiKey!,
              callId,
              openaiBaseUrl,
              openaiApiKey: apiKey,
              recordingId,
              repository,
              salt: transfer.mangoApiSalt!,
            });
          },
        }
      : {}),
  });

  const transferToManager = async (callId: string, reason: string) => {
    const call = await repository.findCall(callId);
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
    const entryId = call.providerEntryId?.trim();
    if (!entryId) return transferFailure("mango_entry_id_missing");

    // The Amazi row can retain a stale or unrelated Mango snapshot. Resolve
    // the current Mango leg again by the entry_id that belongs to this call
    // chain, then validate the state and transfer identifiers on that row.
    const mangoCall =
      typeof repository.findConnectedMangoCallByProviderEntryId === "function"
        ? await repository.findConnectedMangoCallByProviderEntryId(entryId)
        : call.providerEntryId === entryId &&
            call.mangoCallState === "Connected"
          ? call
          : null;
    if (!mangoCall) return transferFailure("mango_call_not_connected");
    const mangoCallId =
      mangoCall.mangoCallId?.trim() ||
      (mangoCall.provider === "mango"
        ? mangoCall.providerCallId?.trim()
        : undefined);
    const initiator = selectMangoTransferInitiator(mangoCall);
    if (!mangoCallId) return transferFailure("mango_call_id_missing");
    if (!initiator) return transferFailure("mango_transfer_initiator_missing");
    if (call.status === "transferring" || call.status === "completed")
      return { accepted: true, duplicate: true };

    const claimed = await repository.claimTransfer(
      callId,
      `transfer_requested:${reason}`,
    );
    if (!claimed) return { accepted: true, duplicate: true };

    try {
      const commandId = `alsma-transfer-${randomUUID()}`;
      await repository.setTransferCommand(callId, commandId, "requested");
      const transferResult = await transferMangoCall({
        apiKey: transfer.mangoApiKey,
        callId: mangoCallId,
        destination: transfer.destination,
        initiator,
        salt: transfer.mangoApiSalt,
        commandId,
        readResult: () => repository.findTransferResult(commandId),
      });
      return { accepted: true, state: transferResult.state };
    } catch (error) {
      const diagnostic =
        error instanceof MangoTransferError
          ? error.diagnostic
          : isTimeoutError(error)
            ? "mango_transfer_timeout"
            : "mango_transfer_error";
      logger.warn(
        {
          stage: "mango_transfer",
          outcome: "failed",
          errorCode: diagnostic,
        },
        "Voice transfer failed",
      );
      await repository.failTransfer(callId, diagnostic).catch(() => undefined);
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
    return transferToManager(input.callId, input.reason);
  };
  const amaziLifecycle = createAmaziLifecycle(repository);
  const testAudioTurn = createVoiceTestAudioTurn({
    apiKey,
    baseUrl: openaiBaseUrl,
    complete: completeWithOpenAI,
    getKnowledgeContext: repository.getKnowledgeContext,
  });

  return {
    testAudioTurn,
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
    ...amaziLifecycle,
    handleMangoWebhook: async (providerEvent: MangoProviderEvent) => {
      if (providerEvent.kind === "transfer_result") {
        await repository.applyTransferResult(
          providerEvent.event.command_id,
          providerEvent.event.result,
        );
        return { received: true };
      }
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
    }) =>
      (async () => {
        const sipCallId = input.providerCallId.startsWith("openai:")
          ? input.providerCallId.slice("openai:".length)
          : undefined;
        const linked = sipCallId
          ? await repository.findBySipCallId(sipCallId)
          : null;
        if (linked)
          return repository.updateCall(linked.id, {
            providerCallId: input.providerCallId,
            sipCallId,
          });
        return repository.ensureCall({ ...input, sipCallId });
      })(),
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
