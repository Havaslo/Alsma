import type { LeadsRepository } from "./leads.repository.js";
import type { CreateLeadBody } from "./leads.schemas.js";

export const createLeadsService = (repository: LeadsRepository) => ({
  create: (input: CreateLeadBody) => repository.create(input),
});

export type LeadsService = ReturnType<typeof createLeadsService>;
