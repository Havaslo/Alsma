import { Router } from "express";

import { createSystemRouter } from "./features/system/system.routes.js";
import type { DatabaseHealth } from "./lib/database/database.js";

type CreateApiRouterOptions = {
  readonly database: DatabaseHealth;
};

export const createApiRouter = ({
  database,
}: CreateApiRouterOptions): Router => {
  const router = Router();

  router.use(createSystemRouter({ database }));

  return router;
};
