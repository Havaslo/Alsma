import type { RequestHandler } from "express";

import { createPaginatedResponse } from "../../lib/http/pagination.js";
import type { AdminOperationsRepository } from "./admin-operations.repository.js";
import type {
  AdminOperationsQuery,
  RecordParams,
  UpdateBonusBody,
  UpdateRequestStatusBody,
} from "./admin-operations.schemas.js";

const listHandler =
  (
    load: (
      query: AdminOperationsQuery,
    ) => Promise<{ items: readonly unknown[]; total: number }>,
  ): RequestHandler =>
  async (_request, response) => {
    const query = response.locals.input.query as AdminOperationsQuery;
    const result = await load(query);
    response.json(createPaginatedResponse(result.items, result.total, query));
  };

export const createListBookingsHandler = (
  repository: AdminOperationsRepository,
): RequestHandler => listHandler(repository.listBookings);
export const createListClientsHandler = (
  repository: AdminOperationsRepository,
): RequestHandler => listHandler(repository.listClients);
export const createListRequestsHandler = (
  repository: AdminOperationsRepository,
): RequestHandler => listHandler(repository.listRequests);
export const createListTasksHandler = (
  repository: AdminOperationsRepository,
): RequestHandler => listHandler(repository.listTasks);
export const createCompleteTaskHandler =
  (repository: AdminOperationsRepository): RequestHandler =>
  async (_request, response) => {
    response.json({
      task: await repository.completeTask(
        (response.locals.input.params as RecordParams).recordId,
      ),
    });
  };
export const createMarkBookingPaidHandler =
  (repository: AdminOperationsRepository): RequestHandler =>
  async (_request, response) => {
    response.json({
      booking: await repository.markBookingPaid(
        (response.locals.input.params as RecordParams).recordId,
      ),
    });
  };
export const createUpdateBonusHandler =
  (repository: AdminOperationsRepository): RequestHandler =>
  async (_request, response) => {
    response.json({
      bonusProgram: await repository.updateBonus(
        (response.locals.input.params as RecordParams).recordId,
        response.locals.input.body as UpdateBonusBody,
      ),
    });
  };
export const createUpdateRequestHandler =
  (repository: AdminOperationsRepository): RequestHandler =>
  async (_request, response) => {
    response.json({
      request: await repository.updateRequest(
        (response.locals.input.params as RecordParams).recordId,
        response.locals.input.body as UpdateRequestStatusBody,
      ),
    });
  };
