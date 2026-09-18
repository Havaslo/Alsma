import { Router } from "express";
import type { Logger } from "pino";

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
  logger: Logger,
): Router => {
  const router = Router();
  const service = createBookingService(
    createBookingRepository(database),
    eptera,
    yookassa,
  );
  const cancelExpiredBookings = async (): Promise<void> => {
    try {
      const result = await service.cancelExpiredBookings();
      if (result.cancelled || result.failed)
        logger.info(result, "Expired booking maintenance completed");
    } catch (error) {
      logger.warn(
        { error: error instanceof Error ? error.message : "Unknown error" },
        "Expired booking maintenance failed",
      );
    }
  };
  const maintenanceTimer = setInterval(
    () => void cancelExpiredBookings(),
    60_000,
  );
  maintenanceTimer.unref();
  void cancelExpiredBookings();
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
