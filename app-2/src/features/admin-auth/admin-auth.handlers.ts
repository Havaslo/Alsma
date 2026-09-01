import type { RequestHandler } from "express";

import type {
  AdminCredentials,
  InitializeAdminBody,
} from "./admin-auth.schemas.js";
import type { AdminAuthService } from "./admin-auth.service.js";

export const createAdminInitializeHandler =
  (service: AdminAuthService): RequestHandler =>
  async (_request, response) => {
    response
      .status(201)
      .json(
        await service.initialize(
          response.locals.input.body as InitializeAdminBody,
        ),
      );
  };
export const createAdminLoginHandler =
  (service: AdminAuthService): RequestHandler =>
  async (_request, response) => {
    const result = await service.login(
      response.locals.input.body as AdminCredentials,
    );
    response.setHeader(
      "Set-Cookie",
      `alsma_admin_session=${result.token}; Max-Age=43200; Path=/; HttpOnly; Secure; SameSite=None; Partitioned`,
    );
    const { token: _token, ...safeResult } = result;
    response.json(safeResult);
  };
export const createAdminMeHandler =
  (service: AdminAuthService): RequestHandler =>
  async (_request, response) => {
    response.json({ user: response.locals.admin });
  };
export const createAdminLogoutHandler =
  (service: AdminAuthService): RequestHandler =>
  async (request, response) => {
    const authorization = request.headers.authorization ?? "";
    response.setHeader(
      "Set-Cookie",
      "alsma_admin_session=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=None; Partitioned",
    );
    response.json(
      await service.logout(
        authorization.startsWith("Bearer ") ? authorization.slice(7) : "",
      ),
    );
  };
export const createAdminStatusHandler =
  (service: AdminAuthService): RequestHandler =>
  async (_request, response) => {
    response.json(await service.status());
  };
