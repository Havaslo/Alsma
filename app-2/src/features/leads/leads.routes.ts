import { Router } from "express";

import type { Database } from "../../lib/database/database.js";
import { validateRequest } from "../../lib/http/validate-request.js";
import { createLeadHandler } from "./leads.handlers.js";
import { createLeadsRepository } from "./leads.repository.js";
import { createLeadBodySchema } from "./leads.schemas.js";
import { createLeadsService } from "./leads.service.js";

export const createLeadsRouter = (database: Database): Router => {
  const router = Router();
  const service = createLeadsService(createLeadsRepository(database));

  router.post(
    "/",
    validateRequest({ body: createLeadBodySchema }),
    createLeadHandler(service),
  );
  return router;
};
