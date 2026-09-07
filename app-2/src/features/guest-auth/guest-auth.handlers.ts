import type { RequestHandler } from "express";

import type {
  CompleteProfileBody,
  LoginBody,
  VerifyCodeBody,
} from "./guest-auth.schemas.js";
import type { GuestAuthService } from "./guest-auth.service.js";
import { readGuestToken } from "./guest-session.js";

export const GUEST_SESSION_COOKIE = "alsma_guest_session";
const sessionCookie = (token: string, maxAge: number) =>
  `${GUEST_SESSION_COOKIE}=${token}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=None; Partitioned`;

export const createCompleteProfileHandler =
  (service: GuestAuthService): RequestHandler =>
  async (request, response) => {
    const guest = await service.completeProfile(
      readGuestToken(request) ?? "",
      response.locals.input.body as CompleteProfileBody,
    );
    response.json({ authenticated: true, guest });
  };

export const createMeHandler =
  (service: GuestAuthService): RequestHandler =>
  async (request, response) => {
    response.json(await service.me(readGuestToken(request)));
  };
export const createLogoutHandler =
  (service: GuestAuthService): RequestHandler =>
  async (request, response) => {
    response.json(await service.logout(readGuestToken(request)));
    response.setHeader("Set-Cookie", sessionCookie("", 0));
  };

export const createRequestCodeHandler =
  (service: GuestAuthService): RequestHandler =>
  async (_request, response) => {
    response.json(
      await service.requestCode(response.locals.input.body as LoginBody),
    );
  };

export const createVerifyCodeHandler =
  (service: GuestAuthService): RequestHandler =>
  async (_request, response) => {
    const result = await service.verifyCode(
      response.locals.input.body as VerifyCodeBody,
    );
    response.setHeader(
      "Set-Cookie",
      sessionCookie(result.token, 30 * 24 * 60 * 60),
    );
    const { token: _token, ...safeResult } = result;
    response.json(safeResult);
  };

export const createEmailLoginHandler =
  (service: GuestAuthService): RequestHandler =>
  async (request, response) => {
    const result = await service.emailLogin(
      response.locals.input.body as LoginBody,
    );
    response.setHeader(
      "Set-Cookie",
      sessionCookie(result.token, 30 * 24 * 60 * 60),
    );
    const { token: _token, ...safeResult } = result;
    response.json(safeResult);
  };
