import type { Prisma } from "../../generated/prisma/client.js";
import type { Database } from "../../lib/database/database.js";

type CallIdentity = {
  readonly callerPhone?: string;
  readonly provider: string;
  readonly providerCallId?: string;
  readonly providerEntryId?: string;
  readonly recordingUrl?: string;
  readonly mangoCallId?: string;
  readonly mangoCallState?: string;
  readonly mangoTransferInitiator?: string;
  readonly sipCallId?: string;
};

// Keep the provider's existing row and its request/transcript. Mango and
// Amazi may already have separate rows when their asynchronous events meet.
// Correlation copies Mango identifiers; it must not steal a unique provider
// identity from the other row or delete its customer data.
export const ensureCall = async (database: Database, input: CallIdentity) => {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await database.client.$transaction(
        async (transaction) => {
          const matches: Prisma.VoiceCallWhereInput[] = [];
          for (const field of [
            "providerCallId",
            "sipCallId",
            "mangoCallId",
            "providerEntryId",
          ] as const) {
            if (input[field]) matches.push({ [field]: input[field] });
          }
          const candidates = matches.length
            ? await transaction.voiceCall.findMany({
                where: { OR: matches },
                orderBy: { createdAt: "asc" },
              })
            : [];
          const existing =
            candidates.find(
              (call) =>
                input.providerCallId &&
                call.providerCallId === input.providerCallId,
            ) ?? candidates[0];
          if (existing) {
            const sipOwner = input.sipCallId
              ? candidates.find((call) => call.sipCallId === input.sipCallId)
              : undefined;
            return transaction.voiceCall.update({
              where: { id: existing.id },
              data: {
                ...input,
                // The SIP leg may belong to the retained Mango row.
                sipCallId:
                  sipOwner && sipOwner.id !== existing.id
                    ? undefined
                    : input.sipCallId,
              },
            });
          }
          const call = await transaction.voiceCall.create({ data: input });
          const request = await transaction.adminRequest.create({
            data: {
              title: "Входящий звонок",
              description: "Входящий звонок из телефонии.",
              category: "voice-call",
              details: {
                source: "Звонки",
                channelType: "call",
                voiceCallId: call.id,
              },
            },
          });
          return transaction.voiceCall.update({
            where: { id: call.id },
            data: { adminRequestId: request.id },
          });
        },
        { isolationLevel: "Serializable" },
      );
    } catch (error) {
      const code =
        error && typeof error === "object" && "code" in error
          ? error.code
          : undefined;
      if (attempt >= 2 || (code !== "P2034" && code !== "P2002")) throw error;
    }
  }
};
