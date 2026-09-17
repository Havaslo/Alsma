import type { Database } from "../../lib/database/database.js";

export const createTransferRepository = (database: Database) => ({
  markTransfer: (id: string, outcome: string) =>
    database.client.voiceCall.update({
      where: { id },
      data: { status: "transferring", outcome },
    }),
  claimTransfer: async (id: string, outcome: string) => {
    const result = await database.client.voiceCall.updateMany({
      where: {
        id,
        status: { notIn: ["transferring", "completed"] },
        OR: [{ transferState: null }, { transferState: "failed" }],
      },
      data: { status: "transferring", transferState: "requested", outcome },
    });
    return result.count === 1;
  },
  failTransfer: (id: string, outcome: string) =>
    database.client.$transaction(async (transaction) => {
      const where = { id, transferState: "requested" };
      await transaction.voiceCall.updateMany({
        where: { ...where, status: "transferring" },
        data: { status: "active" },
      });
      return transaction.voiceCall.updateMany({
        where,
        data: { transferState: "failed", outcome },
      });
    }),
  setTransferCommand: (
    id: string,
    commandId: string,
    transferState: "requested" | "accepted" = "accepted",
  ) =>
    database.client.voiceCall.update({
      where: { id },
      data: { transferCommandId: commandId, transferState },
    }),
  findTransferResult: (commandId: string) =>
    database.client.voiceCall.findFirst({
      where: { transferCommandId: commandId },
      select: { transferState: true, outcome: true },
    }),
  applyTransferResult: async (commandId: string, result: number) => {
    if (result === 0) return;
    await database.client.$transaction(async (transaction) => {
      const where = {
        transferCommandId: commandId,
        transferState: "requested",
      };
      if (result !== 1000) {
        await transaction.voiceCall.updateMany({
          where: { ...where, status: "transferring" },
          data: { status: "active" },
        });
      }
      await transaction.voiceCall.updateMany({
        where,
        data: {
          transferState: result === 1000 ? "accepted" : "failed",
          ...(result === 1000
            ? {}
            : { outcome: `mango_transfer_result_${result}` }),
        },
      });
    });
  },
});
