import { Router } from "express";

import { createGuestAuthRouter } from "./features/guest-auth/guest-auth.routes.js";
import { createLeadsRouter } from "./features/leads/leads.routes.js";
import { createSystemRouter } from "./features/system/system.routes.js";
import type { Database } from "./lib/database/database.js";

type CreateApiRouterOptions = {
  readonly database: Database;
};

export const createApiRouter = ({
  database,
}: CreateApiRouterOptions): Router => {
  const router = Router();

  router.use(createSystemRouter({ database }));
  router.use("/auth", createGuestAuthRouter(database));
  router.use("/site-leads", createLeadsRouter(database));

  return router;
};
