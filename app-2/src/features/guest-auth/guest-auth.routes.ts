import { Router } from "express";

import type { Database } from "../../lib/database/database.js";
import { validateRequest } from "../../lib/http/validate-request.js";
import {
  createCompleteProfileHandler,
  createEmailLoginHandler,
  createLogoutHandler,
  createMeHandler,
  createRequestCodeHandler,
  createVerifyCodeHandler,
} from "./guest-auth.handlers.js";
import { createGuestAuthRepository } from "./guest-auth.repository.js";
import {
  completeProfileBodySchema,
  loginBodySchema,
  verifyCodeBodySchema,
} from "./guest-auth.schemas.js";
import { createGuestAuthService } from "./guest-auth.service.js";

export const createGuestAuthRouter = (
  database: Database,
  mailRu: { readonly email?: string; readonly password?: string },
): Router => {
  const router = Router();
  const service = createGuestAuthService(
    createGuestAuthRepository(database),
    mailRu,
  );
  router.post(
    "/request-code",
    validateRequest({ body: loginBodySchema }),
    createRequestCodeHandler(service),
  );
  router.post(
    "/email-login",
    validateRequest({ body: loginBodySchema }),
    createEmailLoginHandler(service),
  );
  router.post(
    "/verify-code",
    validateRequest({ body: verifyCodeBodySchema }),
    createVerifyCodeHandler(service),
  );
  router.get("/me", createMeHandler(service));
  router.post("/logout", createLogoutHandler(service));
  router.post(
    "/complete-profile",
    validateRequest({ body: completeProfileBodySchema }),
    createCompleteProfileHandler(service),
  );
  return router;
};
