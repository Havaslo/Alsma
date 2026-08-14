import type { RequestHandler } from "express";

const allowedHeaders = "Authorization, Content-Type";
const allowedMethods = "GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS";

export const publicCorsMiddleware: RequestHandler = (
  request,
  response,
  next,
) => {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Headers", allowedHeaders);
  response.setHeader("Access-Control-Allow-Methods", allowedMethods);
  response.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
  response.setHeader("Vary", "Origin, Access-Control-Request-Method");

  if (request.method === "OPTIONS") {
    response.setHeader("Access-Control-Max-Age", "600");
    response.sendStatus(204);
    return;
  }

  next();
};
