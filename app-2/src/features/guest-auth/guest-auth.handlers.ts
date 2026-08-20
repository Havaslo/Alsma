import type { RequestHandler } from "express";

import type { CompleteProfileBody, LoginBody } from "./guest-auth.schemas.js";
import type { GuestAuthService } from "./guest-auth.service.js";

const bearerToken = (authorization: string | undefined): string | null =>
  authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;

export const createCompleteProfileHandler =
  (service: GuestAuthService): RequestHandler =>
  async (request, response) => {
    const guest = await service.completeProfile(
      bearerToken(request.headers.authorization) ?? "",
      response.locals.input.body as CompleteProfileBody,
    );
    response.json({ authenticated: true, guest });
  };

export const createMeHandler =
  (service: GuestAuthService): RequestHandler =>
  async (request, response) => {
    response.json(await service.me(bearerToken(request.headers.authorization)));
  };
export const createLogoutHandler =
  (service: GuestAuthService): RequestHandler =>
  async (request, response) => {
    response.json(
      await service.logout(bearerToken(request.headers.authorization)),
    );
  };

export const createLoginHandler =
  (service: GuestAuthService): RequestHandler =>
  async (_request, response) => {
    response.json(await service.login(response.locals.input.body as LoginBody));
  };
