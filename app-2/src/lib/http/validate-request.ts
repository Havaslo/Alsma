import type { RequestHandler } from "express";
import { type ZodType, z } from "zod";

import { HttpError } from "./http-error.js";

export type RequestSchemas = {
  readonly body?: ZodType;
  readonly params?: ZodType;
  readonly query?: ZodType;
};

export const validateRequest =
  (schemas: RequestSchemas): RequestHandler =>
  (request, response, next) => {
    const result = z
      .object({
        body: schemas.body ?? z.unknown(),
        params: schemas.params ?? z.unknown(),
        query: schemas.query ?? z.unknown(),
      })
      .safeParse({
        body: request.body,
        params: request.params,
        query: request.query,
      });

    if (!result.success) {
      next(
        new HttpError(
          400,
          "VALIDATION_ERROR",
          "Request validation failed.",
          result.error.flatten(),
        ),
      );
      return;
    }

    response.locals.input = result.data;
    next();
  };
