import type { Database } from "../../lib/database/database.js";
import { createLegalAcceptance } from "../../lib/legal/consent.js";
import type { CreateLeadBody } from "./leads.schemas.js";

export const createLeadsRepository = (database: Database) => ({
  create: (input: CreateLeadBody) =>
    database.client.siteLead.create({
      data: {
        details: {
          checkInDate: input.checkInDate,
          checkOutDate: input.checkOutDate,
          comment: input.comment,
          guestsCount: input.guestsCount,
          appointmentTime: input.appointmentTime,
          legalAcceptances: [
            createLegalAcceptance({
              action: "site_lead_submission",
              pageUrl: input.consents.pageUrl,
              purpose: "respond_to_customer_request",
              type: "personal_data_consent",
            }),
            ...(input.consents.marketingChannels.length > 0
              ? [
                  {
                    ...createLegalAcceptance({
                      action: "site_lead_submission",
                      pageUrl: input.consents.pageUrl,
                      purpose: "send_marketing_messages",
                      type: "marketing_consent",
                    }),
                    channels: input.consents.marketingChannels,
                  },
                ]
              : []),
          ],
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
