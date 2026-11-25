import { type RequestHandler, Router } from "express";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";

import type { Database } from "../../lib/database/database.js";
import { HttpError } from "../../lib/http/http-error.js";
import { validateRequest } from "../../lib/http/validate-request.js";
import {
  createRequireAdmin,
  createRequireAdminPermission,
} from "../admin-auth/admin-auth.middleware.js";
import { createAdminAuthRepository } from "../admin-auth/admin-auth.repository.js";
import { createAdminAuthService } from "../admin-auth/admin-auth.service.js";
import { offersQuerySchema } from "../booking/booking.schemas.js";
import { hashGuestToken, readGuestToken } from "../guest-auth/guest-session.js";
import type { TravelLineSyncService } from "./travelline-sync.service.js";
import type { TravelLineService } from "./travelline.service.js";

export const validTravelLineWebhookKey = (
  provided: string | undefined,
  expected: string | undefined,
) => {
  if (!provided || !expected || expected.length < 32) return false;
  const a = Buffer.from(provided),
    b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};

export const createTravelLineRouter = (
  database: Database,
  service: TravelLineService,
  sync: TravelLineSyncService,
): Router => {
  const router = Router();
  const requireGuest: RequestHandler = async (request, response, next) => {
    const token = readGuestToken(request);
    const session = token
      ? await database.client.guestLoginCode.findFirst({
          where: {
            codeHash: hashGuestToken(token),
            consumedAt: { not: null },
            expiresAt: { gt: new Date() },
          },
          select: { userId: true },
        })
      : null;
    if (!session?.userId)
      throw new HttpError(401, "SESSION_INVALID", "Войдите в личный кабинет.");
    response.locals.guestUserId = session.userId;
    next();
  };
  router.get("/config", (_request, response) =>
    response.json({
      enabled: service.enabled,
      checkoutReady:
        service.enabled && Boolean(service.configuration.bookingUrl),
      provider: "travelline",
    }),
  );
  router.get(
    "/offers",
    validateRequest({ query: offersQuerySchema }),
    async (_request, response) => {
      const input = response.locals.input.query;
      if (input.children !== input.childAges.length)
        throw new HttpError(
          400,
          "CHILD_AGES_REQUIRED",
          "Укажите возраст каждого ребёнка.",
        );
      response.json({ offers: await service.getOffers(input), search: input });
    },
  );
  router.get(
    "/checkout",
    validateRequest({ query: offersQuerySchema }),
    async (_request, response) => {
      if (!service.enabled)
        throw new HttpError(
          503,
          "TRAVELLINE_DISABLED",
          "Бронирование временно недоступно.",
        );
      const input = response.locals.input.query;
      // Validate dates even for a handoff, without making an availability request.
      if (input.checkOut <= input.checkIn)
        throw new HttpError(
          400,
          "DATES_INVALID",
          "Дата выезда должна быть позже даты заезда.",
        );
      response.setHeader("Cache-Control", "no-store");
      response.redirect(302, service.checkoutUrl(input));
    },
  );
  router.post("/webhook", async (request, response) => {
    if (
      !service.enabled ||
      !validTravelLineWebhookKey(
        request.get("API-KEY"),
        service.configuration.webhookSecret,
      )
    )
      throw new HttpError(
        401,
        "TRAVELLINE_WEBHOOK_UNAUTHORIZED",
        "Unauthorized",
      );
    await sync.acceptEvents(request.body);
    response.sendStatus(204);
  });
  router.post(
    "/cancellation-requests",
    requireGuest,
    validateRequest({
      body: z
        .object({
          bookingId: z.uuid(),
          reason: z.string().trim().max(500).optional(),
        })
        .strict(),
    }),
    async (_request, response) => {
      response.json(
        await sync.requestCancellation(
          response.locals.guestUserId,
          response.locals.input.body.bookingId,
          response.locals.input.body.reason,
        ),
      );
    },
  );
  return router;
};

export const createTravelLineAdminRouter = (
  database: Database,
  service: TravelLineService,
  sync: TravelLineSyncService,
): Router => {
  const router = Router();
  router.use(
    createRequireAdmin(
      createAdminAuthService(createAdminAuthRepository(database)),
    ),
  );
  router.get(
    "/status",
    createRequireAdminPermission("integrations.access"),
    (_request, response) =>
      response.json({
        enabled: service.enabled,
        propertyId: service.configuration.propertyId,
        checkoutReady: Boolean(service.configuration.bookingUrl),
        webhookReady: Boolean(service.configuration.webhookSecret),
      }),
  );
  router.post(
    "/link-booking",
    createRequireAdminPermission("dashboard.access"),
    validateRequest({
      body: z
        .object({
          userId: z.uuid(),
          bookingNumber: z.string().regex(/^[A-Za-z0-9_-]{1,100}$/u),
          ownershipConfirmed: z.literal(true),
        })
        .strict(),
    }),
    async (_request, response) => {
      const input = response.locals.input.body;
      response.json(
        await sync.linkBooking(
          input.userId,
          input.bookingNumber,
          response.locals.admin.id,
        ),
      );
    },
  );
  return router;
};
