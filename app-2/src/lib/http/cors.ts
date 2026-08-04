import type { RequestHandler } from "express";

export const publicCorsMiddleware: RequestHandler = (
  request,
  response,
  next,
) => {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type",
  );
  response.setHeader(
    "Access-Control-Allow-Methods",
    "GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS",
  );
  response.setHeader("Access-Control-Expose-Headers", "Content-Disposition");

  if (request.method === "OPTIONS") {
    response.sendStatus(204);
    return;
  }

  next();
};
