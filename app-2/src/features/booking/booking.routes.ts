import { Router } from "express";

import type { Database } from "../../lib/database/database.js";
import { validateRequest } from "../../lib/http/validate-request.js";
import {
  createOffersHandler,
  createReservationHandler,
} from "./booking.handlers.js";
import { createBookingRepository } from "./booking.repository.js";
import {
  createReservationBodySchema,
  offersQuerySchema,
} from "./booking.schemas.js";
import { createBookingService } from "./booking.service.js";
import type { EpteraClient } from "./eptera.client.js";

export const createBookingRouter = (
  database: Database,
  eptera: EpteraClient,
): Router => {
  const router = Router();
  const service = createBookingService(
    createBookingRepository(database),
    eptera,
  );
  router.get(
    "/offers",
    validateRequest({ query: offersQuerySchema }),
    createOffersHandler(service),
  );
  router.post(
    "/reservations",
    validateRequest({ body: createReservationBodySchema }),
    createReservationHandler(service),
  );
  return router;
};
