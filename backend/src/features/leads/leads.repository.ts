import type { Database } from "../../lib/database/database.js";
import type { CreateLeadBody } from "./leads.schemas.js";

export const createLeadsRepository = (database: Database) => ({
  create: (input: CreateLeadBody) =>
    database.client.siteLead.create({
      data: {
        details: {
          checkInDate: input.checkInDate,
          checkOutDate: input.checkOutDate,
          guestsCount: input.guestsCount,
        },
        email: input.email,
        formCode: input.formCode,
        formTitle: input.formTitle,
        name: input.name,
        phone: input.phone,
        sourcePage: input.sourcePage,
      },
      select: { createdAt: true, id: true, status: true },
    }),
});

export type LeadsRepository = ReturnType<typeof createLeadsRepository>;
