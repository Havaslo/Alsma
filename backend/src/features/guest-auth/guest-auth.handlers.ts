import type { RequestHandler } from "express";

import type {
  CompleteProfileBody,
  RequestCodeBody,
  VerifyCodeBody,
} from "./guest-auth.schemas.js";
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

export const createRequestCodeHandler =
  (service: GuestAuthService): RequestHandler =>
  async (_request, response) => {
    response
      .status(201)
      .json(
        await service.requestCode(
          response.locals.input.body as RequestCodeBody,
        ),
      );
  };

export const createVerifyCodeHandler =
  (service: GuestAuthService): RequestHandler =>
  async (_request, response) => {
    response.json(
      await service.verifyCode(response.locals.input.body as VerifyCodeBody),
    );
  };
