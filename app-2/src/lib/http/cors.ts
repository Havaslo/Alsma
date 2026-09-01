import type { RequestHandler } from "express";

const allowedHeaders = "Authorization, Content-Type";
const allowedMethods = "GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS";

export const publicCorsMiddleware = (
  allowedOrigins: readonly string[],
): RequestHandler => {
  const origins = new Set(allowedOrigins);

  return (request, response, next) => {
    const requestOrigin = request.get("Origin");
    const isAllowedOrigin = Boolean(
      requestOrigin && origins.has(requestOrigin),
    );

    response.setHeader("Access-Control-Allow-Headers", allowedHeaders);
    response.setHeader("Access-Control-Allow-Methods", allowedMethods);
    response.setHeader("Access-Control-Allow-Credentials", "true");
    response.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
    response.setHeader("Vary", "Origin, Access-Control-Request-Method");

    if (requestOrigin && isAllowedOrigin) {
      response.setHeader("Access-Control-Allow-Origin", requestOrigin);
    }

    if (request.method === "OPTIONS") {
      if (!isAllowedOrigin) {
        response.sendStatus(403);
        return;
      }
      response.setHeader("Access-Control-Max-Age", "600");
      response.sendStatus(204);
      return;
    }

    next();
  };
};
