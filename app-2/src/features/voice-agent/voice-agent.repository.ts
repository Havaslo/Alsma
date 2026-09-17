import { createHash } from "node:crypto";

import type { Prisma } from "../../generated/prisma/client.js";
import type { Database } from "../../lib/database/database.js";
import { ensureDefaultAgentPlaybook } from "../agent/agent-playbook.js";
import { ensureCall } from "./voice-agent.identity.js";
import type { CreateCallBody, TranscriptBody } from "./voice-agent.schemas.js";
import { canReplaceName, trustedName } from "./voice-agent.transcript.js";
import { createTransferRepository } from "./voice-agent.transfer-repository.js";

const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const transcriptAuthor = (role: TranscriptBody["role"]) =>
  role === "assistant" ? "agent" : role;

const transcriptExternalId = (callId: string, segment: TranscriptBody) =>
  `voice:${callId}:${
    segment.providerEventId ??
    createHash("sha256")
      .update(
        JSON.stringify({
          endedAt: segment.endedAt,
          role: segment.role,
          startedAt: segment.startedAt,
          text: segment.text,
        }),
      )
      .digest("hex")
  }`;

export const transcriptSegmentId = transcriptExternalId;

export const createVoiceAgentRepository = (database: Database) => ({
  getAgentSettings: async () =>
    (
      await database.client.appSetting.findUnique({
        where: { key: "agent.settings" },
        select: { value: true },
      })
    )?.value,
  createCall: async (input: CreateCallBody) =>
    ensureCall(database, {
      callerPhone: input.callerPhone,
      provider: "mango",
      providerCallId: input.providerCallId,
      recordingUrl: input.recordingUrl,
    }),
  ensureCall: (input: {
    callerPhone?: string;
    provider: string;
    providerCallId: string;
    providerEntryId?: string;
    mangoCallId?: string;
    mangoCallState?: string;
    mangoTransferInitiator?: string;
    sipCallId?: string;
  }) => ensureCall(database, input),
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
        where: {
          enabled: true,
          channels: { has: "voice" },
          NOT: { title: "Голос: уведомление о возможной записи" },
        },
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
      const externalId = transcriptExternalId(id, segment);
      const alreadyPersisted = transcript.some((item) => {
        const value = asObject(item);
        return value.externalId === externalId;
      });
      if (alreadyPersisted) return call;
      await transaction.chatMessage.upsert({
        where: {
          conversationId_externalId: {
            conversationId: adminRequestId,
            externalId,
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
            { ...segment, at: new Date().toISOString(), externalId },
          ],
        },
      });
    });
  },
  replaceTranscript: async (id: string) =>
    database.client.$transaction(async (transaction) => {
      const call = await transaction.voiceCall.findUnique({ where: { id } });
      if (!call) return null;
      if (call.adminRequestId)
        await transaction.chatMessage.deleteMany({
          where: {
            conversationId: call.adminRequestId,
            externalId: { startsWith: `voice:${id}:` },
          },
        });
      return transaction.voiceCall.update({
        where: { id },
        data: { transcript: [] },
      });
    }),
  completeCall: (
    id: string,
    data: {
      outcome?: string;
      recordingUrl?: string;
      recordingObjectId?: string;
      summary?: string;
      intent?: string;
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
  findByMangoCallId: (mangoCallId: string) =>
    database.client.voiceCall.findFirst({ where: { mangoCallId } }),
  findBySipCallId: (sipCallId: string) =>
    database.client.voiceCall.findUnique({ where: { sipCallId } }),
  findByProviderEntryId: (providerEntryId: string) =>
    database.client.voiceCall.findFirst({
      orderBy: { startedAt: "desc" },
      where: { providerEntryId },
    }),
  findConnectedMangoCallByProviderEntryId: async (providerEntryId: string) => {
    const call = await database.client.voiceCall.findFirst({
      orderBy: [{ updatedAt: "desc" }, { providerSequence: "desc" }],
      where: { providerEntryId, mangoCallId: { not: null } },
    });
    return call?.mangoCallState === "Connected" ? call : null;
  },
  findActiveAmaziCallByCallerPhone: async (
    callerPhone: string,
    at = new Date(),
  ) => {
    const windowStart = new Date(at.getTime() - 15 * 60 * 1_000);
    const windowEnd = new Date(at.getTime() + 15 * 60 * 1_000);
    const normalizePhone = (value: string) => value.replace(/\D/gu, "");
    const calls = await database.client.voiceCall.findMany({
      orderBy: { startedAt: "desc" },
      take: 20,
      where: {
        callerPhone: { not: null },
        mangoCallId: null,
        provider: "amazi",
        startedAt: { gte: windowStart, lte: windowEnd },
        status: { in: ["active", "on_hold", "transferring"] },
      },
    });
    const normalized = normalizePhone(callerPhone);
    return calls.find(
      (call) =>
        Boolean(call.callerPhone) &&
        normalizePhone(call.callerPhone as string) === normalized,
    );
  },
  findUniqueActiveAmaziCallNear: async (
    at: Date,
    maxDistanceMilliseconds = 30_000,
  ) => {
    const windowStart = new Date(at.getTime() - maxDistanceMilliseconds);
    const windowEnd = new Date(at.getTime() + maxDistanceMilliseconds);
    const calls = await database.client.voiceCall.findMany({
      orderBy: { startedAt: "desc" },
      take: 2,
      where: {
        mangoCallId: null,
        provider: "amazi",
        startedAt: { gte: windowStart, lte: windowEnd },
        status: { in: ["active", "on_hold", "transferring"] },
      },
    });
    return calls.length === 1 ? calls[0] : null;
  },
  findUniqueMangoCallNear: async (
    at: Date,
    maxDistanceMilliseconds = 30_000,
  ) => {
    const windowStart = new Date(at.getTime() - maxDistanceMilliseconds);
    const windowEnd = new Date(at.getTime() + maxDistanceMilliseconds);
    const calls = await database.client.voiceCall.findMany({
      orderBy: { startedAt: "desc" },
      take: 2,
      where: {
        mangoCallId: { not: null },
        mangoTransferInitiator: {
          not: null,
          notIn: ["", "from.number", "to.number"],
        },
        provider: "mango",
        OR: [
          {
            startedAt: { gte: windowStart, lte: windowEnd },
            status: { in: ["active", "on_hold", "transferring"] },
          },
          {
            endedAt: { gte: windowStart, lte: windowEnd },
            status: "completed",
          },
        ],
      },
    });
    return calls.length === 1 ? calls[0] : null;
  },
  updateCall: (id: string, data: Prisma.VoiceCallUpdateInput) =>
    database.client.voiceCall.update({ data, where: { id } }),
  claimWebhookEvent: async (input: {
    eventKey: string;
    provider: string;
    entryId?: string;
    callId?: string;
    sequence?: number;
  }) => {
    try {
      await database.client.voiceWebhookEvent.create({
        data: {
          callId: input.callId,
          entryId: input.entryId,
          eventKey: input.eventKey,
          provider: input.provider,
          sequence: input.sequence,
        },
      });
      return true;
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "P2002"
      )
        return false;
      throw error;
    }
  },
  releaseWebhookEvent: (eventKey: string) =>
    database.client.voiceWebhookEvent.deleteMany({ where: { eventKey } }),
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
  ...createTransferRepository(database),
});

export type VoiceAgentRepository = ReturnType<
  typeof createVoiceAgentRepository
>;
