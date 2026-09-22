import type { RequestHandler } from "express";

import type {
  BookingCancellationRequestBody,
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

export const bookingCancellationRequestHandler =
  (service: BookingService): RequestHandler =>
  async (_request, response) => {
    const booking = await service.requestCancellation({
      ...(response.locals.input.body as BookingCancellationRequestBody),
      userId: response.locals.guestUserId as string,
    });
    response.json({
      booking: {
        cancellationRequestedAt: booking.cancellationRequestedAt,
        cancellationStatus: booking.cancellationStatus,
        id: booking.id,
        refundStatus: booking.refundStatus,
        status: booking.status,
      },
    });
  };

export const paymentWebhookHandler =
  (service: BookingService, yookassa: YooKassaClient): RequestHandler =>
  async (request, response) => {
    const body = request.body as {
      event?: unknown;
      object?: { id?: unknown };
    };
    const paymentId =
      typeof body.object?.id === "string" ? body.object.id : null;
    if (body.event === "refund.succeeded" || body.event === "refund.canceled") {
      if (paymentId)
        await service.reconcileRefund(await yookassa.getRefund(paymentId));
      response.sendStatus(204);
      return;
    }
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
