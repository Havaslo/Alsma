import { type RequestHandler, Router } from "express";
import type { Logger } from "pino";

import type { Database } from "../../lib/database/database.js";
import { HttpError } from "../../lib/http/http-error.js";
import { validateRequest } from "../../lib/http/validate-request.js";
import { hashGuestToken, readGuestToken } from "../guest-auth/guest-session.js";
import {
  bookingCancellationRequestHandler,
  createOffersHandler,
  createReservationHandler,
  paymentStatusHandler,
  paymentWebhookHandler,
} from "./booking.handlers.js";
import {
  bookingCancellationRequestBodySchema,
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
  database: Database,
): Router => {
  const router = Router();
  const requireGuestUser: RequestHandler = async (request, response, next) => {
    const token = readGuestToken(request);
    const session = token
      ? await database.client.guestLoginCode.findFirst({
          select: { userId: true },
          where: {
            codeHash: hashGuestToken(token),
            consumedAt: { not: null },
            expiresAt: { gt: new Date() },
          },
        })
      : null;
    if (!session?.userId) {
      next(new HttpError(401, "SESSION_INVALID", "Войдите в личный кабинет."));
      return;
    }
    response.locals.guestUserId = session.userId;
    next();
  };
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
  router.post(
    "/cancellation-requests",
    requireGuestUser,
    validateRequest({ body: bookingCancellationRequestBodySchema }),
    bookingCancellationRequestHandler(service),
  );
  router.post("/payments/webhook", paymentWebhookHandler(service, yookassa));
  return router;
};
