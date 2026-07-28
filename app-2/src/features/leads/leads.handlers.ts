import type { RequestHandler } from "express";

import type { CreateLeadBody } from "./leads.schemas.js";
import type { LeadsService } from "./leads.service.js";

export const createLeadHandler =
  (service: LeadsService): RequestHandler =>
  async (_request, response) => {
    const lead = await service.create(
      response.locals.input.body as CreateLeadBody,
    );
    response.status(201).json({ lead });
  };
