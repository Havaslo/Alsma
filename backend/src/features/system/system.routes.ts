import { Router } from "express";

import type { DatabaseHealth } from "../../lib/database/database.js";
import { validateRequest } from "../../lib/http/validate-request.js";
import { createGetApiHealth, getHello } from "./system.handlers.js";
import { helloQuerySchema } from "./system.schemas.js";

type CreateSystemRouterOptions = {
  readonly database: DatabaseHealth;
};

export const createSystemRouter = ({
  database,
}: CreateSystemRouterOptions): Router => {
  const router = Router();

  router.get("/health", createGetApiHealth(database));
  router.get("/hello", validateRequest({ query: helloQuerySchema }), getHello);

  return router;
};
