import type { RequestHandler } from "express";

import type { AdminSettingsService } from "./admin-settings.service.js";

export const createListAdminSettingsHandler =
  (service: AdminSettingsService): RequestHandler =>
  async (_request, response) =>
    response.json(await service.list());
export const createSaveAdminRoleHandler =
  (service: AdminSettingsService, update: boolean): RequestHandler =>
  async (_request, response) => {
    const { body, params } = response.locals.input;
    response.json({
      role: update
        ? await service.updateRole(params.id, body)
        : await service.createRole(body),
    });
  };
export const createSaveAdminUserHandler =
  (service: AdminSettingsService, update: boolean): RequestHandler =>
  async (_request, response) => {
    const { body, params } = response.locals.input;
    response.json({
      user: update
        ? await service.updateUser(params.id, body)
        : await service.createUser(body),
    });
  };
export const createDeleteAdminUserHandler =
  (service: AdminSettingsService): RequestHandler =>
  async (_request, response) => {
    await service.deleteUser(response.locals.input.params.id);
    response.status(204).end();
  };
