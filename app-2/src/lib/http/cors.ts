import type { RequestHandler } from "express";

const allowedOrigins = new Set(
  (process.env.CORS_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);

export const corsMiddleware: RequestHandler = (request, response, next) => {
  const origin = request.header("Origin");
  const isAllowedOrigin = Boolean(origin && allowedOrigins.has(origin));

  if (origin && isAllowedOrigin) {
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Access-Control-Allow-Credentials", "true");
    response.setHeader(
      "Access-Control-Allow-Headers",
      "Authorization, Content-Type",
    );
    response.setHeader(
      "Access-Control-Allow-Methods",
      "GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS",
    );
    response.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
    response.setHeader("Vary", "Origin");
  }

  if (request.method === "OPTIONS") {
    response.sendStatus(isAllowedOrigin ? 204 : 403);
    return;
  }

  next();
};
