import type { RequestHandler } from "express";

import type { CreateReservationBody, OffersQuery } from "./booking.schemas.js";
import type { BookingService } from "./booking.service.js";

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
