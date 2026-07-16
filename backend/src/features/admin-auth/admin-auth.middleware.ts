import type { RequestHandler } from "express";

import type { AdminAuthService } from "./admin-auth.service.js";

export const createRequireAdmin =
  (service: AdminAuthService): RequestHandler =>
  async (request, response, next) => {
    try {
      const authorization = request.headers.authorization ?? "";
      const token = authorization.startsWith("Bearer ")
        ? authorization.slice(7)
        : "";
      response.locals.admin = await service.me(token);
      next();
    } catch (error) {
      next(error);
    }
  };
