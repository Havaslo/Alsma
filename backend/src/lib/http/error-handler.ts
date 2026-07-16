import type { ErrorRequestHandler } from "express";

import { HttpError } from "./http-error.js";

const normalizeError = (error: unknown): HttpError | null => {
  if (error instanceof HttpError) return error;
  if (!(error instanceof Error)) return null;

  const bodyError = error as Error & { status?: number; type?: string };
  if (bodyError.type === "entity.parse.failed") {
    return new HttpError(
      400,
      "INVALID_JSON",
      "Request body must contain valid JSON.",
    );
  }
  if (bodyError.status === 413 || bodyError.type === "entity.too.large") {
    return new HttpError(
      413,
      "PAYLOAD_TOO_LARGE",
      "Request body is too large.",
    );
  }
  return null;
};

export const errorHandler: ErrorRequestHandler = (
  error,
  request,
  response,
  _next,
) => {
  const knownError = normalizeError(error);
  const status = knownError?.status ?? 500;

  if (!knownError) request.log.error({ error }, "Unhandled request error");

  response.status(status).json({
    error: {
      code: knownError?.code ?? "INTERNAL_ERROR",
      ...(knownError?.details === undefined
        ? {}
        : { details: knownError.details }),
      message: knownError?.message ?? "An unexpected error occurred.",
    },
    requestId: request.id,
  });
};
