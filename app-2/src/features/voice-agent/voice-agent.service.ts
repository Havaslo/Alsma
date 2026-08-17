import { createHash, randomUUID } from "node:crypto";

import type { ManagedStorage } from "../../lib/storage/managed-storage.js";
import type { VoiceAgentRepository } from "./voice-agent.repository.js";
import type {
  CreateCallBody,
  MangoWebhookBody,
  ToolBody,
  TranscriptBody,
} from "./voice-agent.schemas.js";

const transferMangoCall = async ({
  apiKey,
  callId,
  destination,
  salt,
}: {
  readonly apiKey: string;
  readonly callId: string;
  readonly destination: string;
  readonly salt: string;
}) => {
  const commandId = `alsma-transfer-${randomUUID()}`;
  const json = JSON.stringify({
    command_id: commandId,
    call_id: callId,
    method: "blind",
    to_number: destination,
    initiator: "to.number",
  });
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

export const recordingDisclosure =
  "Разговор записывается. Аудио, расшифровка и данные звонка хранятся 30 дней, затем удаляются.";

const systemPrompt = `Ты — вежливый русскоязычный голосовой помощник базы отдыха ALSMA. Представляйся сотрудником базы. Отвечай только по переданным правилам и базе знаний. Не выдумывай наличие, цены или подтверждение брони: пока PMS не подключена, принимай заявку и обещай проверку менеджером. Если клиент просит человека или вопрос нужно передать менеджеру, сразу вызови transfer_to_manager без дополнительных вопросов и подтверждений. Отвечай коротко, естественно и удобно для телефона.`;

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
  apiKey?: string,
  openaiBaseUrl?: string,
  transfer?: {
    readonly mangoApiKey?: string;
    readonly mangoApiSalt?: string;
    readonly destination?: string;
  },
  managedStorage?: ManagedStorage,
) => {
  const completeWithOpenAI = async (prompt: string, json = false) => {
    if (!apiKey || !openaiBaseUrl)
      throw new Error("OpenAI AI Gateway is not configured");
    const response = await fetch(
      `${openaiBaseUrl.replace(/\/$/u, "")}/v1/chat/completions`,
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
            { role: "system", content: systemPrompt },
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

  return {
    testAudioTurn: async (audioBase64: string, mimeType: string) => {
      if (!apiKey || !openaiBaseUrl)
        throw new Error("OpenAI AI Gateway is not configured");
      const audio = Buffer.from(audioBase64, "base64");
      const form = new FormData();
      form.append("file", new Blob([audio], { type: mimeType }), "turn.webm");
      form.append("model", "gpt-4o-mini-transcribe");
      const transcriptionResponse = await fetch(
        `${openaiBaseUrl.replace(/\/$/u, "")}/v1/audio/transcriptions`,
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
        `${openaiBaseUrl.replace(/\/$/u, "")}/v1/audio/speech`,
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
    createRealtimeSession: async () => {
      if (!apiKey || !openaiBaseUrl)
        throw new Error("Realtime AI Gateway is not configured");
      const response = await fetch(
        `${openaiBaseUrl.replace(/\/$/u, "")}/v1/realtime/client_secrets`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            session: {
              type: "realtime",
              model: "gpt-realtime",
              audio: { output: { voice: "marin" } },
            },
          }),
          signal: AbortSignal.timeout(10_000),
        },
      );
      if (!response.ok)
        throw new Error(
          `Realtime session failed with status ${response.status}`,
        );
      const body = (await response.json()) as {
        value?: string;
        client_secret?: { value?: string };
      };
      const token = body.value ?? body.client_secret?.value;
      if (!token) throw new Error("Realtime session token was not returned");
      return { token, model: "gpt-realtime" };
    },
    createCall: async (input: CreateCallBody) => ({
      ...(await repository.createCall(input)),
      disclosure: recordingDisclosure,
    }),
    appendTranscript: (id: string, segment: TranscriptBody) =>
      repository.appendTranscript(id, segment),
    answer: async (question: string, callId?: string) => {
      const knowledge = await repository.getKnowledgeContext();
      const answer = await completeWithOpenAI(
        `Вопрос гостя: ${question}\n\nБаза знаний и правила:\n${knowledge}`,
      );
      return { answer, callId };
    },
    completeCall: async (
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
    },
    handleMangoWebhook: async (event: MangoWebhookBody) => {
      const existing = await repository.findByProviderCallId(event.callId);
      const call =
        existing ??
        (await repository.createCall({
          providerCallId: event.callId,
          callerPhone: event.callerPhone,
        }));
      if (event.transcript) {
        for (const segment of event.transcript)
          await repository.appendTranscript(call.id, segment);
      }
      if (
        ["completed", "hangup", "ended", "failed"].includes(
          event.event.toLowerCase(),
        )
      ) {
        let recordingObjectId: string | undefined;
        if (event.recordingUrl && managedStorage) {
          const recordingUrl = new URL(event.recordingUrl);
          if (recordingUrl.protocol !== "https:")
            throw new Error("Recording URL must use HTTPS");
          const recordingResponse = await fetch(recordingUrl, {
            signal: AbortSignal.timeout(30_000),
          });
          if (recordingResponse.ok) {
            const contentLength = Number(
              recordingResponse.headers.get("content-length") ?? 0,
            );
            if (contentLength <= 50 * 1024 * 1024) {
              const bytes = new Uint8Array(
                await recordingResponse.arrayBuffer(),
              );
              if (bytes.byteLength <= 50 * 1024 * 1024) {
                recordingObjectId = (
                  await managedStorage.upload({
                    content: bytes,
                    contentType:
                      recordingResponse.headers.get("content-type") ??
                      "audio/mpeg",
                    name: `voice-call-${call.id}.audio`,
                  })
                ).objectId;
              }
            }
          }
        }
        const completed = await repository.completeCall(call.id, {
          outcome: event.status ?? event.event,
          recordingUrl: event.recordingUrl,
          recordingObjectId,
          summary: "Звонок завершён. Заявка передана менеджеру.",
          intent: "booking_request",
          extracted: event.extracted ?? {},
        });
        if (!existing || existing.status !== "completed") {
          await repository.createRequestForCall(
            call.id,
            event.extracted ?? {},
            event.transcript ?? [],
          );
        }
        return completed;
      }
      return call;
    },
    tool: async (input: ToolBody) => {
      if (input.name === "knowledge_answer")
        return {
          answer: await (async () => {
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
      const call = await repository.findCall(input.callId);
      if (
        !call?.providerCallId ||
        !transfer?.mangoApiKey ||
        !transfer.mangoApiSalt ||
        !transfer.destination
      )
        return { accepted: false, reason: "transfer_not_configured" };
      await repository.markTransfer(
        input.callId,
        `transfer_requested:${input.reason}`,
      );
      await transferMangoCall({
        apiKey: transfer.mangoApiKey,
        callId: call.providerCallId,
        destination: transfer.destination,
        salt: transfer.mangoApiSalt,
      });
      return { accepted: true, destination: transfer.destination };
    },
  };
};

export type VoiceAgentService = ReturnType<typeof createVoiceAgentService>;
