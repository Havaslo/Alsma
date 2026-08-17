import type { VoiceAgentRepository } from "./voice-agent.repository.js";
import type {
  CreateCallBody,
  MangoWebhookBody,
  TranscriptBody,
} from "./voice-agent.schemas.js";

export const recordingDisclosure =
  "Разговор записывается. Аудио, расшифровка и данные звонка хранятся 30 дней, затем удаляются.";

const systemPrompt = `Ты — вежливый русскоязычный голосовой помощник базы отдыха ALSMA. Представляйся сотрудником базы. Отвечай только по переданным правилам и базе знаний. Не выдумывай наличие, цены или подтверждение брони: пока PMS не подключена, принимай заявку и обещай проверку менеджером. Если ответа нет или клиент просит человека, предложи перевод/обратный звонок. Отвечай коротко, естественно и удобно для телефона.`;

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
) => {
  const completeWithOpenAI = async (prompt: string, json = false) => {
    if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2,
        response_format: json ? { type: "json_object" } : undefined,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
      }),
    });
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
        const completed = await repository.completeCall(call.id, {
          outcome: event.status ?? event.event,
          recordingUrl: event.recordingUrl,
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
  };
};

export type VoiceAgentService = ReturnType<typeof createVoiceAgentService>;
