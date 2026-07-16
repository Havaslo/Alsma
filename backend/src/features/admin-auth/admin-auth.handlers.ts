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
    response.json(
      await service.login(response.locals.input.body as AdminCredentials),
    );
  };
export const createAdminMeHandler =
  (service: AdminAuthService): RequestHandler =>
  async (_request, response) => {
    response.json({ user: response.locals.admin });
  };
export const createAdminStatusHandler =
  (service: AdminAuthService): RequestHandler =>
  async (_request, response) => {
    response.json(await service.status());
  };
