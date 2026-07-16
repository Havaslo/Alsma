import { Router } from "express";

import { createAdminAuthRouter } from "./features/admin-auth/admin-auth.routes.js";
import { createAdminLeadsRouter } from "./features/admin-leads/admin-leads.routes.js";
import { createAdminOperationsRouter } from "./features/admin-operations/admin-operations.routes.js";
import { createGuestAuthRouter } from "./features/guest-auth/guest-auth.routes.js";
import { createKnowledgeBaseRouter } from "./features/knowledge-base/knowledge-base.routes.js";
import { createLeadsRouter } from "./features/leads/leads.routes.js";
import { createSiteContentRouter } from "./features/site-content/site-content.routes.js";
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
  router.use("/admin/auth", createAdminAuthRouter(database));
  router.use("/admin/site-leads", createAdminLeadsRouter(database));
  router.use("/admin", createAdminOperationsRouter(database));
  router.use("/auth", createGuestAuthRouter(database));
  router.use("/site-leads", createLeadsRouter(database));
  router.use("/site-content", createSiteContentRouter(database));
  router.use("/admin/knowledge-base", createKnowledgeBaseRouter(database));

  return router;
};
