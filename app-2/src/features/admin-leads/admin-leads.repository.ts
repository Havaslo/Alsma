import type { Database } from "../../lib/database/database.js";
import { getPaginationRange } from "../../lib/http/pagination.js";
import type {
  AdminLeadsQuery,
  UpdateAdminLeadBody,
} from "./admin-leads.schemas.js";

export const createAdminLeadsRepository = (database: Database) => ({
  list: async (query: AdminLeadsQuery) => {
    const where = query.status ? { status: query.status } : {};
    const { skip, take } = getPaginationRange(query);
    const [items, total] = await database.client.$transaction([
      database.client.siteLead.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take,
        where,
      }),
      database.client.siteLead.count({ where }),
    ]);
    return { items, total };
  },
  update: (leadId: string, input: UpdateAdminLeadBody) =>
    database.client.siteLead.update({ data: input, where: { id: leadId } }),
});

export type AdminLeadsRepository = ReturnType<
  typeof createAdminLeadsRepository
>;
