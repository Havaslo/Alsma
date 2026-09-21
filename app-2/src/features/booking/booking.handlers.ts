import type { RequestHandler } from "express";

import type {
  CreateReservationBody,
  OffersQuery,
  PaymentStatusQuery,
} from "./booking.schemas.js";
import type { BookingService } from "./booking.service.js";
import type { YooKassaClient } from "./yookassa.client.js";

export const createOffersHandler =
  (service: BookingService): RequestHandler =>
  async (_request, response) => {
    response.json(
      await service.offers(response.locals.input.query as OffersQuery),
    );
  };

export const createReservationHandler =
  (service: BookingService): RequestHandler =>
  async (_request, response) => {
    response
      .status(201)
      .json(
        await service.createReservation(
          response.locals.input.body as CreateReservationBody,
        ),
      );
  };

export const paymentStatusHandler =
  (service: BookingService): RequestHandler =>
  async (_request, response) => {
    response.json(
      await service.paymentStatus(
        response.locals.input.query as PaymentStatusQuery,
      ),
    );
  };

export const paymentWebhookHandler =
  (service: BookingService, yookassa: YooKassaClient): RequestHandler =>
  async (request, response) => {
    const body = request.body as { event?: unknown; object?: { id?: unknown } };
    const paymentId =
      typeof body.object?.id === "string" ? body.object.id : null;
    if (
      body.event !== "payment.succeeded" &&
      body.event !== "payment.canceled"
    ) {
      response.sendStatus(204);
      return;
    }
    if (paymentId)
      await service.reconcilePayment(await yookassa.getPayment(paymentId));
    response.sendStatus(204);
  };
