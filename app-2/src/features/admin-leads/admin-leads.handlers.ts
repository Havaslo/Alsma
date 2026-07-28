import type { RequestHandler } from "express";

import { createPaginatedResponse } from "../../lib/http/pagination.js";
import type { AdminLeadsRepository } from "./admin-leads.repository.js";
import type {
  AdminLeadParams,
  AdminLeadsQuery,
  UpdateAdminLeadBody,
} from "./admin-leads.schemas.js";

export const createListAdminLeadsHandler =
  (repository: AdminLeadsRepository): RequestHandler =>
  async (_request, response) => {
    const query = response.locals.input.query as AdminLeadsQuery;
    const { items, total } = await repository.list(query);
    response.json(createPaginatedResponse(items, total, query));
  };
export const createUpdateAdminLeadHandler =
  (repository: AdminLeadsRepository): RequestHandler =>
  async (_request, response) => {
    const { leadId } = response.locals.input.params as AdminLeadParams;
    response.json({
      lead: await repository.update(
        leadId,
        response.locals.input.body as UpdateAdminLeadBody,
      ),
    });
  };
