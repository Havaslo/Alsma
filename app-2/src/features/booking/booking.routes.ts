import { Router } from "express";
import type { Logger } from "pino";

import { validateRequest } from "../../lib/http/validate-request.js";
import {
  createOffersHandler,
  createReservationHandler,
  paymentStatusHandler,
  paymentWebhookHandler,
} from "./booking.handlers.js";
import {
  calendarPricesQuerySchema,
  createReservationBodySchema,
  offersQuerySchema,
  paymentStatusQuerySchema,
} from "./booking.schemas.js";
import type { BookingService } from "./booking.service.js";
import type { YooKassaClient } from "./yookassa.client.js";

export const createBookingRouter = (
  service: BookingService,
  yookassa: YooKassaClient,
  logger: Logger,
): Router => {
  const router = Router();
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
  router.get(
    "/payments/status",
    validateRequest({ query: paymentStatusQuerySchema }),
    paymentStatusHandler(service),
  );
  router.post("/payments/webhook", paymentWebhookHandler(service, yookassa));
  return router;
};
