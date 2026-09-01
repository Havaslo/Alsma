import type { RequestHandler } from "express";

import { HttpError } from "../../lib/http/http-error.js";
import type { AdminAuthService } from "./admin-auth.service.js";

const cookieToken = (header: string | undefined): string | null =>
  header
    ?.split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith("alsma_admin_session="))
    ?.split("=")[1] ?? null;

export const createRequireAdmin =
  (service: AdminAuthService): RequestHandler =>
  async (request, response, next) => {
    try {
      const authorization = request.headers.authorization ?? "";
      const token =
        cookieToken(request.headers.cookie) ??
        (authorization.startsWith("Bearer ") ? authorization.slice(7) : "");
      response.locals.admin = await service.me(token);
      next();
    } catch (error) {
      next(error);
    }
  };

export const createRequireAdminPermission =
  (...requiredPermissions: string[]): RequestHandler =>
  (_request, response, next) => {
    const permissions = (response.locals.admin?.permissions ?? []) as string[];
    if (
      !permissions.includes("*") &&
      !requiredPermissions.some((permission) =>
        permissions.includes(permission),
      )
    ) {
      next(
        new HttpError(
          403,
          "ADMIN_PERMISSION_REQUIRED",
          "Недостаточно прав для этого раздела.",
        ),
      );
      return;
    }
    next();
  };
