import { Router } from "express";

import type { Database } from "../../lib/database/database.js";
import { validateRequest } from "../../lib/http/validate-request.js";
import {
  createCompleteProfileHandler,
  createLogoutHandler,
  createMeHandler,
  createRequestCodeHandler,
  createVerifyCodeHandler,
} from "./guest-auth.handlers.js";
import { createGuestAuthRepository } from "./guest-auth.repository.js";
import {
  completeProfileBodySchema,
  requestCodeBodySchema,
  verifyCodeBodySchema,
} from "./guest-auth.schemas.js";
import { createGuestAuthService } from "./guest-auth.service.js";

export const createGuestAuthRouter = (database: Database): Router => {
  const router = Router();
  const service = createGuestAuthService(createGuestAuthRepository(database));
  router.post(
    "/request-code",
    validateRequest({ body: requestCodeBodySchema }),
    createRequestCodeHandler(service),
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
