import type { Prisma } from "../../generated/prisma/client.js";
import type { Database } from "../../lib/database/database.js";
import type { CreateCallBody, TranscriptBody } from "./voice-agent.schemas.js";

export const createVoiceAgentRepository = (database: Database) => ({
  createCall: (input: CreateCallBody) =>
    database.client.voiceCall.create({ data: input }),
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
});

export type VoiceAgentRepository = ReturnType<
  typeof createVoiceAgentRepository
>;
