import { Router } from "express";

import type { Database } from "../../lib/database/database.js";
import { validateRequest } from "../../lib/http/validate-request.js";
import {
  createOffersHandler,
  createReservationHandler,
  paymentWebhookHandler,
} from "./booking.handlers.js";
import { createBookingRepository } from "./booking.repository.js";
import {
  calendarPricesQuerySchema,
  createReservationBodySchema,
  offersQuerySchema,
} from "./booking.schemas.js";
import { createBookingService } from "./booking.service.js";
import type { EpteraClient } from "./eptera.client.js";
import type { YooKassaClient } from "./yookassa.client.js";

export const createBookingRouter = (
  database: Database,
  eptera: EpteraClient,
  yookassa: YooKassaClient,
): Router => {
  const router = Router();
  const service = createBookingService(
    createBookingRepository(database),
    eptera,
    yookassa,
  );
  router.get(
    "/offers",
    validateRequest({ query: offersQuerySchema }),
    createOffersHandler(service),
  );
  router.get(
    "/calendar-prices",
    validateRequest({ query: calendarPricesQuerySchema }),
    async (_request, response) =>
      response.json(await service.calendarPrices(response.locals.input.query)),
  );
  router.post(
    "/reservations",
    validateRequest({ body: createReservationBodySchema }),
    createReservationHandler(service),
  );
  router.post("/payments/webhook", paymentWebhookHandler(service, yookassa));
  return router;
};
