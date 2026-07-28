import type { RequestHandler } from "express";

import type { DatabaseHealth } from "../../lib/database/database.js";
import type { HelloQuery } from "./system.schemas.js";

export const createGetApiHealth =
  (database: DatabaseHealth): RequestHandler =>
  async (request, response) => {
    try {
      await database.check();
      response.json({ database: "ok", status: "ok" });
    } catch {
      request.log.warn("Database readiness check failed");
      response
        .status(503)
        .json({ database: "unavailable", status: "unavailable" });
    }
  };

export const getHello: RequestHandler = (_request, response) => {
  const { name } = response.locals.input.query as HelloQuery;
  response.json({ message: `Hello, ${name ?? "world"}!` });
};
