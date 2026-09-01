import type { RequestHandler } from "express";

import type { CompleteProfileBody, LoginBody } from "./guest-auth.schemas.js";
import type { GuestAuthService } from "./guest-auth.service.js";

export const GUEST_SESSION_COOKIE = "alsma_guest_session";
const bearerToken = (authorization: string | undefined): string | null =>
  authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
const requestToken = (request: {
  headers: { authorization?: string; cookie?: string };
}) => {
  const cookie = request.headers.cookie?.split(";").map((item) => item.trim());
  const token = cookie
    ?.find((item) => item.startsWith(`${GUEST_SESSION_COOKIE}=`))
    ?.split("=")[1];
  return token ?? bearerToken(request.headers.authorization);
};
const sessionCookie = (token: string, maxAge: number) =>
  `${GUEST_SESSION_COOKIE}=${token}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=None; Partitioned`;

export const createCompleteProfileHandler =
  (service: GuestAuthService): RequestHandler =>
  async (request, response) => {
    const guest = await service.completeProfile(
      requestToken(request) ?? "",
      response.locals.input.body as CompleteProfileBody,
    );
    response.json({ authenticated: true, guest });
  };

export const createMeHandler =
  (service: GuestAuthService): RequestHandler =>
  async (request, response) => {
    response.json(await service.me(requestToken(request)));
  };
export const createLogoutHandler =
  (service: GuestAuthService): RequestHandler =>
  async (request, response) => {
    response.json(await service.logout(requestToken(request)));
    response.setHeader("Set-Cookie", sessionCookie("", 0));
  };

export const createLoginHandler =
  (service: GuestAuthService): RequestHandler =>
  async (_request, response) => {
    const result = await service.login(response.locals.input.body as LoginBody);
    response.setHeader(
      "Set-Cookie",
      sessionCookie(result.token, 30 * 24 * 60 * 60),
    );
    const { token: _token, ...safeResult } = result;
    response.json(safeResult);
  };
