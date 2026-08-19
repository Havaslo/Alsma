import type { Prisma } from "../../generated/prisma/client.js";
import type { Database } from "../../lib/database/database.js";
import type { CreateCallBody, TranscriptBody } from "./voice-agent.schemas.js";

export const createVoiceAgentRepository = (database: Database) => ({
  getAgentSettings: async () =>
    (await database.client.appSetting.findUnique({
      where: { key: "agent.settings" },
      select: { value: true },
    }))?.value,
  createCall: (input: CreateCallBody) =>
    database.client.voiceCall.create({ data: { ...input, provider: "mango" } }),
  getKnowledgeContext: async () => {
    const [articles, rules] = await Promise.all([
      database.client.knowledgeArticle.findMany({
        where: { status: "published", channels: { has: "voice" } },
        orderBy: { updatedAt: "desc" },
      }),
      database.client.agentRule.findMany({
        where: { enabled: true, channels: { has: "voice" } },
        orderBy: { priority: "desc" },
      }),
    ]);
    return [
      ...articles.map((item) => `${item.title}: ${item.content}`),
      ...rules.map((item) => `Правило ${item.title}: ${item.content}`),
    ].join("\n\n");
  },
  findCall: (id: string) =>
    database.client.voiceCall.findUnique({ where: { id } }),
  appendTranscript: async (id: string, segment: TranscriptBody) => {
    const call = await database.client.voiceCall.findUnique({ where: { id } });
    if (!call) return null;
    const transcript = Array.isArray(call.transcript) ? call.transcript : [];
    return database.client.voiceCall.update({
      where: { id },
      data: {
        transcript: [
          ...transcript,
          { ...segment, at: new Date().toISOString() },
        ],
      },
    });
  },
  completeCall: (
    id: string,
    data: {
      outcome?: string;
      recordingUrl?: string;
      recordingObjectId?: string;
      summary: string;
      intent: string;
      extracted: Record<string, unknown>;
    },
  ) =>
    database.client.voiceCall.update({
      where: { id },
      data: {
        ...data,
        extracted: data.extracted as Prisma.InputJsonValue,
        status: "completed",
        endedAt: new Date(),
      },
    }),
  findByProviderCallId: (providerCallId: string) =>
    database.client.voiceCall.findUnique({ where: { providerCallId } }),
  createRequestForCall: (
    callId: string,
    extracted: Record<string, unknown>,
    transcript: unknown,
  ) =>
    database.client.adminRequest.create({
      data: {
        title: "Заявка из голосового агента",
        description: "Заявка на бронирование/запись из входящего звонка.",
        requester:
          typeof extracted.name === "string" ? extracted.name : undefined,
        contact:
          typeof extracted.phone === "string" ? extracted.phone : undefined,
        category: "voice-agent-booking",
        details: {
          source: "mango",
          callId,
          extracted,
          transcript,
        } as Prisma.InputJsonValue,
      },
      select: { id: true },
    }),
  markTransfer: (id: string, outcome: string) =>
    database.client.voiceCall.update({
      where: { id },
      data: { status: "transferring", outcome },
    }),
});

export type VoiceAgentRepository = ReturnType<
  typeof createVoiceAgentRepository
>;
