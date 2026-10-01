import type { Request, Response } from "express";
import assert from "node:assert/strict";
import { test } from "node:test";

import { HttpError } from "../../lib/http/http-error.js";
import { createAdminLoginHandler } from "./admin-auth.handlers.js";
import { createRequireAdmin } from "./admin-auth.middleware.js";
import type { AdminAuthService } from "./admin-auth.service.js";

test("admin login returns a bearer fallback while setting the session cookie", async () => {
  const result = {
    token: "temporary-admin-token",
    user: {
      displayName: "Admin",
      email: "admin@example.com",
      id: "admin-id",
      permissions: ["*"],
      role: "Administrator",
    },
  };
  const service = {
    login: async () => result,
  } as unknown as AdminAuthService;
  let responseBody: unknown;
  const responseHeaders = new Map<string, string>();
  const response = {
    json: (value: unknown) => {
      responseBody = value;
      return response;
    },
    locals: {
      input: { body: { email: result.user.email, password: "secret" } },
    },
    setHeader: (name: string, value: string) => {
      responseHeaders.set(name, value);
      return response;
    },
  } as unknown as Response;

  await createAdminLoginHandler(service)({} as Request, response, (error) => {
    if (error) throw error;
  });

  assert.deepEqual(responseBody, result);
  assert.equal(responseHeaders.get("Cache-Control"), "no-store");
  assert.match(responseHeaders.get("Set-Cookie") ?? "", /HttpOnly/);
  assert.match(
    responseHeaders.get("Set-Cookie") ?? "",
    /temporary-admin-token/,
  );
});

test("admin auth falls back to a bearer token after an invalid cookie", async () => {
  const attempts: string[] = [];
  const user = { id: "admin-id" };
  const service = {
    me: async (token: string) => {
      attempts.push(token);
      if (token === "stale-cookie-token") {
        throw new HttpError(
          401,
          "ADMIN_SESSION_INVALID",
          "Сессия администратора недействительна.",
        );
      }
      return user;
    },
  } as unknown as AdminAuthService;
  const response = { locals: {} } as unknown as Response;
  let nextError: unknown;

  await createRequireAdmin(service)(
    {
      headers: {
        authorization: "Bearer current-bearer-token",
        cookie: "alsma_admin_session=stale-cookie-token",
      },
    } as Request,
    response,
    (error) => {
      nextError = error;
    },
  );

  assert.deepEqual(attempts, ["stale-cookie-token", "current-bearer-token"]);
  assert.equal(response.locals.admin, user);
  assert.equal(nextError, undefined);
});
