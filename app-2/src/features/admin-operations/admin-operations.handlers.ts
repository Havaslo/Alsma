import type { RequestHandler } from "express";

import { HttpError } from "../../lib/http/http-error.js";
import { createPaginatedResponse } from "../../lib/http/pagination.js";
import type { AdminOperationsRepository } from "./admin-operations.repository.js";
import type {
  AdminOperationsQuery,
  CreateBookingBody,
  RecordParams,
  UpdateBonusBody,
  UpdateClientBody,
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
export const createBookingHandler =
  (repository: AdminOperationsRepository): RequestHandler =>
  async (_request, response) => {
    response.status(201).json({
      booking: await repository.createBooking(
        response.locals.input.body as CreateBookingBody,
      ),
    });
  };
export const createListClientsHandler = (
  repository: AdminOperationsRepository,
): RequestHandler => listHandler(repository.listClients);
export const createGetClientHandler =
  (repository: AdminOperationsRepository): RequestHandler =>
  async (_request, response) => {
    const client = await repository.getClient(
      (response.locals.input.params as RecordParams).recordId,
    );
    if (!client) {
      throw new HttpError(404, "CLIENT_NOT_FOUND", "Клиент не найден.");
    }
    response.json({ client });
  };
export const createListRequestsHandler = (
  repository: AdminOperationsRepository,
): RequestHandler => listHandler(repository.listRequests);
export const createListVoiceCallsHandler = (
  repository: AdminOperationsRepository,
): RequestHandler => listHandler(repository.listVoiceCalls);
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
export const createUpdateClientHandler =
  (repository: AdminOperationsRepository): RequestHandler =>
  async (_request, response) => {
    response.json({
      client: await repository.updateClient(
        (response.locals.input.params as RecordParams).recordId,
        response.locals.input.body as UpdateClientBody,
      ),
    });
  };
export const createDeleteClientHandler =
  (repository: AdminOperationsRepository): RequestHandler =>
  async (_request, response) => {
    await repository.deleteClient(
      (response.locals.input.params as RecordParams).recordId,
    );
    response.status(204).end();
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
