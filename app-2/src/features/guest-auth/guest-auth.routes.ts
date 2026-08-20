import { Router } from "express";

import type { Database } from "../../lib/database/database.js";
import { validateRequest } from "../../lib/http/validate-request.js";
import {
  createCompleteProfileHandler,
  createLoginHandler,
  createLogoutHandler,
  createMeHandler,
} from "./guest-auth.handlers.js";
import { createGuestAuthRepository } from "./guest-auth.repository.js";
import {
  completeProfileBodySchema,
  loginBodySchema,
} from "./guest-auth.schemas.js";
import { createGuestAuthService } from "./guest-auth.service.js";

export const createGuestAuthRouter = (database: Database): Router => {
  const router = Router();
  const service = createGuestAuthService(createGuestAuthRepository(database));
  router.post(
    "/login",
    validateRequest({ body: loginBodySchema }),
    createLoginHandler(service),
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
