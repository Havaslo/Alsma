import { Router } from "express";
import { z } from "zod";

import type { Database } from "../../lib/database/database.js";
import {
  createRequireAdmin,
  createRequireAdminPermission,
} from "../admin-auth/admin-auth.middleware.js";
import { createAdminAuthRepository } from "../admin-auth/admin-auth.repository.js";
import { createAdminAuthService } from "../admin-auth/admin-auth.service.js";

const orderSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().email(),
  phone: z.string().trim().min(7).max(32),
  items: z
    .array(
      z.object({
        variantId: z.string().uuid(),
        quantity: z.number().int().min(1).max(20),
        startsAt: z.string().datetime().optional(),
      }),
    )
    .min(1)
    .max(30),
});

export const createServicesRouter = (database: Database): Router => {
  const router = Router();
  router.get("/", async (request, response) => {
    const services = await database.client.service.findMany({
      where: {
        status: "published",
        ...(request.query.page
          ? { placements: { some: { pageSlug: String(request.query.page) } } }
          : {}),
      },
      include: {
        variants: { where: { active: true }, orderBy: { price: "asc" } },
        placements: true,
      },
    });
    response.json({ services });
  });
  router.get("/:serviceId/availability", async (request, response) => {
    const from = new Date(
      String(request.query.from ?? new Date().toISOString()),
    );
    const to = new Date(
      String(
        request.query.to ?? new Date(Date.now() + 30 * 86400000).toISOString(),
      ),
    );
    const blocks = await database.client.serviceScheduleBlock.findMany({
      where: {
        serviceId: request.params.serviceId,
        variantId: request.query.variantId
          ? String(request.query.variantId)
          : undefined,
        startsAt: { gte: from, lte: to },
      },
      orderBy: { startsAt: "asc" },
    });
    const freeBlocks = await Promise.all(
      blocks.map(async (block) => {
        const booked = await database.client.serviceBooking.count({
          where: {
            variantId: String(request.query.variantId),
            startsAt: { lt: block.endsAt },
            endsAt: { gt: block.startsAt },
            status: { not: "cancelled" },
          },
        });
        return booked < block.capacity ? block : null;
      }),
    );
    response.json({ blocks: freeBlocks.filter(Boolean) });
  });
  router.post("/orders", async (request, response) => {
    const input = orderSchema.parse(request.body);
    if (input.items.some((item) => !item.startsAt))
      return response.status(400).json({
        error: {
          code: "BOOKING_SLOT_REQUIRED",
          message: "Для каждой услуги выберите дату и слот.",
        },
      });
    const variants = await database.client.serviceVariant.findMany({
      where: {
        id: { in: input.items.map((item) => item.variantId) },
        active: true,
      },
      include: { service: true },
    });
    if (variants.length !== input.items.length)
      return response
        .status(400)
        .json({ error: { code: "VARIANT_UNAVAILABLE" } });
    const byId = new Map(variants.map((variant) => [variant.id, variant]));
    if (
      input.items.some(
        (item) => item.quantity > byId.get(item.variantId)!.capacity,
      )
    )
      return response.status(400).json({
        error: {
          code: "CAPACITY_EXCEEDED",
          message: "Количество гостей превышает вместимость варианта.",
        },
      });
    const total = input.items.reduce(
      (sum, item) =>
        sum + Number(byId.get(item.variantId)!.price) * item.quantity,
      0,
    );
    const order = await database.client.serviceOrder.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone,
        total,
        items: {
          create: input.items.map((item) => {
            const variant = byId.get(item.variantId)!;
            return {
              variantId: variant.id,
              serviceId: variant.serviceId,
              quantity: item.quantity,
              unitPrice: variant.price,
              ...(item.startsAt
                ? {
                    booking: {
                      create: {
                        serviceId: variant.serviceId,
                        variantId: variant.id,
                        startsAt: new Date(item.startsAt),
                        endsAt: new Date(
                          new Date(item.startsAt).getTime() +
                            (variant.durationMin ?? 60) * 60000,
                        ),
                      },
                    },
                  }
                : {}),
            };
          }),
        },
      },
      include: { items: true },
    });
    response.status(201).json({
      orderId: order.id,
      status: order.status,
      total: order.total.toString(),
      currency: order.currency,
    });
  });
  const admin = Router();
  admin.use(
    createRequireAdmin(
      createAdminAuthService(createAdminAuthRepository(database)),
    ),
  );
  admin.use(createRequireAdminPermission("dashboard.access"));
  admin.get("/catalog", async (_request, response) => {
    response.json({
      services: await database.client.service.findMany({
        include: { variants: true, placements: true, rules: true },
      }),
    });
  });
  admin.post("/catalog", async (request, response) => {
    const input = z
      .object({
        slug: z.string().min(1),
        name: z.string().min(1),
        description: z.string().optional(),
        status: z.enum(["draft", "published", "archived"]).default("draft"),
      })
      .parse(request.body);
    response
      .status(201)
      .json({ service: await database.client.service.create({ data: input }) });
  });
  admin.put("/catalog/:serviceId", async (request, response) => {
    const input = z
      .object({
        slug: z.string().min(1),
        name: z.string().min(1),
        description: z.string().nullable(),
        status: z.enum(["draft", "published", "archived"]),
      })
      .parse(request.body);
    response.json({
      service: await database.client.service.update({
        where: { id: request.params.serviceId },
        data: input,
      }),
    });
  });
  admin.post("/catalog/:serviceId/variants", async (request, response) => {
    const input = z
      .object({
        name: z.string().min(1),
        description: z.string().optional(),
        price: z.number().nonnegative(),
        capacity: z.number().int().positive(),
        durationMin: z.number().int().positive().nullable(),
        active: z.boolean().default(true),
      })
      .parse(request.body);
    response.status(201).json({
      variant: await database.client.serviceVariant.create({
        data: { ...input, serviceId: request.params.serviceId },
      }),
    });
  });
  admin.put(
    "/catalog/:serviceId/variants/:variantId",
    async (request, response) => {
      const input = z
        .object({
          name: z.string().min(1),
          description: z.string().nullable(),
          price: z.number().nonnegative(),
          capacity: z.number().int().positive(),
          durationMin: z.number().int().positive().nullable(),
          active: z.boolean(),
        })
        .parse(request.body);
      response.json({
        variant: await database.client.serviceVariant.update({
          where: { id: request.params.variantId },
          data: input,
        }),
      });
    },
  );
  admin.post("/catalog/:serviceId/placements", async (request, response) => {
    const input = z
      .object({
        pageSlug: z.string().min(1),
        position: z.number().int().default(0),
      })
      .parse(request.body);
    response.status(201).json({
      placement: await database.client.servicePagePlacement.upsert({
        where: {
          serviceId_pageSlug: {
            serviceId: request.params.serviceId,
            pageSlug: input.pageSlug,
          },
        },
        create: { ...input, serviceId: request.params.serviceId },
        update: { position: input.position },
      }),
    });
  });
  admin.post("/catalog/:serviceId/rules", async (request, response) => {
    const input = z
      .object({
        weekday: z.number().int().min(0).max(6),
        startTime: z.string(),
        endTime: z.string(),
      })
      .parse(request.body);
    response.status(201).json({
      rule: await database.client.serviceAvailabilityRule.create({
        data: { ...input, serviceId: request.params.serviceId },
      }),
    });
  });
  admin.get("/calendar", async (request, response) => {
    const from = new Date(
      String(request.query.from ?? new Date().toISOString()),
    );
    const to = new Date(
      String(
        request.query.to ?? new Date(Date.now() + 31 * 86400000).toISOString(),
      ),
    );
    const bookings = await database.client.serviceBooking.findMany({
      where: { startsAt: { gte: from, lte: to } },
      include: {
        service: true,
        variant: true,
        orderItem: { include: { order: true } },
      },
      orderBy: { startsAt: "asc" },
    });
    response.json({ bookings });
  });
  router.use("/admin", admin);
  return router;
};
