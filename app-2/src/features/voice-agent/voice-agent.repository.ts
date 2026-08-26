import { createHash } from "node:crypto";

import type { Prisma } from "../../generated/prisma/client.js";
import type { Database } from "../../lib/database/database.js";
import { ensureDefaultAgentPlaybook } from "../agent/agent-playbook.js";
import type { CreateCallBody, TranscriptBody } from "./voice-agent.schemas.js";

const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const safePersonName = (value: unknown) => {
  if (typeof value !== "string") return undefined;
  const name = value.trim().replace(/\s+/gu, " ");
  return /^[а-яё-]{2,40}(?:\s+[а-яё-]{2,40})?$/iu.test(name) ? name : undefined;
};

const selfIntroducedName = (transcript: unknown) => {
  if (!Array.isArray(transcript)) return undefined;
  for (const item of transcript) {
    const segment = asObject(item);
    if (segment.role !== "guest") continue;
    const text = typeof segment.text === "string" ? segment.text : "";
    const match = text.match(
      /(?:меня\s+зовут|это\s+я|я\s*[—-])\s*([а-яё-]{2,40}(?:\s+[а-яё-]{2,40})?)/iu,
    );
    const name = safePersonName(match?.[1]);
    if (name) return name;
  }
  return undefined;
};

const trustedName = (extracted: Record<string, unknown>, transcript: unknown) =>
  selfIntroducedName(transcript) ??
  (Number(extracted.nameConfidence) >= 0.85
    ? safePersonName(extracted.name)
    : undefined);

const canReplaceName = (value: string | null) =>
  !value || /^(гость|клиент|неизвестн(?:ый|ая))$/iu.test(value.trim());

const transcriptAuthor = (role: TranscriptBody["role"]) =>
  role === "assistant" ? "agent" : role;

const transcriptExternalId = (callId: string, segment: TranscriptBody) =>
  `voice:${callId}:${createHash("sha256")
    .update(
      JSON.stringify({
        endedAt: segment.endedAt,
        role: segment.role,
        startedAt: segment.startedAt,
        text: segment.text,
      }),
    )
    .digest("hex")}`;

export const createVoiceAgentRepository = (database: Database) => ({
  getAgentSettings: async () =>
    (
      await database.client.appSetting.findUnique({
        where: { key: "agent.settings" },
        select: { value: true },
      })
    )?.value,
  createCall: async (input: CreateCallBody) =>
    database.client.$transaction(async (transaction) => {
      const call = await transaction.voiceCall.create({
        data: { ...input, provider: "mango" },
      });
      const request = await transaction.adminRequest.create({
        data: {
          title: "Входящий звонок",
          description: "Входящий звонок из телефонии.",
          category: "voice-call",
          details: {
            source: "Звонки",
            channelType: "call",
            voiceCallId: call.id,
          } as Prisma.InputJsonValue,
        },
      });
      return transaction.voiceCall.update({
        where: { id: call.id },
        data: { adminRequestId: request.id },
      });
    }),
  getKnowledgeContext: async () => {
    await ensureDefaultAgentPlaybook(database);
    const [articles, rules, scenarios, transferRules] = await Promise.all([
      database.client.knowledgeArticle.findMany({
        where: { status: "published", channels: { has: "voice" } },
        orderBy: { updatedAt: "desc" },
      }),
      database.client.agentRule.findMany({
        where: { enabled: true, channels: { has: "voice" } },
        orderBy: { priority: "desc" },
      }),
      database.client.agentScenario.findMany({
        where: { enabled: true, channels: { has: "voice" } },
        orderBy: { updatedAt: "desc" },
      }),
      database.client.agentTransferRule.findMany({
        where: { enabled: true, channels: { has: "voice" } },
        orderBy: { updatedAt: "desc" },
      }),
    ]);
    return [
      ...articles.map((item) => `${item.title}: ${item.content}`),
      ...rules.map((item) => `Правило ${item.title}: ${item.content}`),
      ...scenarios.map(
        (item) => `Голосовой сценарий ${item.title}: ${item.response}`,
      ),
      ...transferRules.map(
        (item) =>
          `Правило перевода ${item.title}: ${item.condition}. Назначение: ${item.destination}`,
      ),
    ].join("\n\n");
  },
  findCall: (id: string) =>
    database.client.voiceCall.findUnique({ where: { id } }),
  appendTranscript: async (id: string, segment: TranscriptBody) => {
    return database.client.$transaction(async (transaction) => {
      const call = await transaction.voiceCall.findUnique({ where: { id } });
      if (!call) return null;
      let adminRequestId = call.adminRequestId;
      if (!adminRequestId) {
        const request = await transaction.adminRequest.create({
          data: {
            title: "Входящий звонок",
            description: "Входящий звонок из телефонии.",
            category: "voice-call",
            details: {
              source: "Звонки",
              channelType: "call",
              voiceCallId: call.id,
              legacyVoiceCall: true,
            } as Prisma.InputJsonValue,
          },
        });
        adminRequestId = request.id;
        await transaction.voiceCall.update({
          where: { id },
          data: { adminRequestId },
        });
      }
      const transcript = Array.isArray(call.transcript) ? call.transcript : [];
      await transaction.chatMessage.upsert({
        where: {
          conversationId_externalId: {
            conversationId: adminRequestId,
            externalId: transcriptExternalId(id, segment),
          },
        },
        create: {
          author: transcriptAuthor(segment.role),
          conversationId: adminRequestId,
          createdAt: segment.startedAt
            ? new Date(segment.startedAt)
            : undefined,
          externalId: transcriptExternalId(id, segment),
          text: segment.text,
        },
        update: {},
      });
      await transaction.adminRequest.update({
        where: { id: adminRequestId },
        data: { updatedAt: new Date() },
      });
      return transaction.voiceCall.update({
        where: { id },
        data: {
          transcript: [
            ...transcript,
            { ...segment, at: new Date().toISOString() },
          ],
        },
      });
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
    database.client.$transaction(async (transaction) => {
      const call = await transaction.voiceCall.findUnique({ where: { id } });
      if (!call) return null;
      const updated = await transaction.voiceCall.update({
        where: { id },
        data: {
          ...data,
          extracted: data.extracted as Prisma.InputJsonValue,
          status: "completed",
          endedAt: new Date(),
        },
      });
      const existingRequest = call.adminRequestId
        ? await transaction.adminRequest.findUnique({
            where: { id: call.adminRequestId },
          })
        : null;
      const extracted = asObject(data.extracted);
      const name = trustedName(extracted, updated.transcript);
      const contact =
        typeof extracted.phone === "string"
          ? extracted.phone
          : updated.callerPhone;
      const requestData = {
        description: updated.summary ?? "Входящий звонок из телефонии.",
        ...(name &&
        (!existingRequest || canReplaceName(existingRequest.requester))
          ? { requester: name }
          : {}),
        ...(contact && !existingRequest?.contact ? { contact } : {}),
        details: {
          ...asObject(existingRequest?.details),
          source: "Звонки",
          channelType: "call",
          voiceCallId: updated.id,
          callStatus: updated.status,
          callOutcome: updated.outcome,
          callIntent: updated.intent,
          extracted,
        } as Prisma.InputJsonValue,
      };
      const request = existingRequest
        ? await transaction.adminRequest.update({
            where: { id: existingRequest.id },
            data: requestData,
          })
        : await transaction.adminRequest.create({
            data: {
              title: "Входящий звонок",
              category: "voice-call",
              ...requestData,
            },
          });
      if (!updated.adminRequestId) {
        await transaction.voiceCall.update({
          where: { id },
          data: { adminRequestId: request.id },
        });
      }
      return updated;
    }),
  findByProviderCallId: (providerCallId: string) =>
    database.client.voiceCall.findUnique({ where: { providerCallId } }),
  createRequestForCall: (
    callId: string,
    extracted: Record<string, unknown>,
    transcript: unknown,
  ) =>
    database.client.$transaction(async (transaction) => {
      const call = await transaction.voiceCall.findUnique({
        where: { id: callId },
      });
      if (!call) throw new Error("Voice call not found");
      const existing = call.adminRequestId
        ? await transaction.adminRequest.findUnique({
            where: { id: call.adminRequestId },
          })
        : null;
      const name = trustedName(extracted, transcript);
      const request = existing
        ? await transaction.adminRequest.update({
            where: { id: existing.id },
            data: {
              ...(name && canReplaceName(existing.requester)
                ? { requester: name }
                : {}),
              details: {
                ...asObject(existing.details),
                extracted,
                voiceCallId: callId,
                source: "Звонки",
                channelType: "call",
              } as Prisma.InputJsonValue,
            },
            select: { id: true },
          })
        : await transaction.adminRequest.create({
            data: {
              title: "Входящий звонок",
              description: "Заявка из входящего звонка.",
              requester: name,
              contact:
                typeof extracted.phone === "string"
                  ? extracted.phone
                  : call.callerPhone,
              category: "voice-call",
              details: {
                source: "Звонки",
                channelType: "call",
                voiceCallId: callId,
                extracted,
                transcript,
              } as Prisma.InputJsonValue,
            },
            select: { id: true },
          });
      if (!call.adminRequestId)
        await transaction.voiceCall.update({
          where: { id: callId },
          data: { adminRequestId: request.id },
        });
      return request;
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
