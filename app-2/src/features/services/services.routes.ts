import { Router } from "express";
import { z } from "zod";

import type { Database } from "../../lib/database/database.js";
import {
  createRequireAdmin,
  createRequireAdminPermission,
} from "../admin-auth/admin-auth.middleware.js";
import { createAdminAuthRepository } from "../admin-auth/admin-auth.repository.js";
import { createAdminAuthService } from "../admin-auth/admin-auth.service.js";
import {
  isProductVariant,
  isServiceSlotAvailable,
  listServiceAvailability,
} from "./service-availability.js";

const sortServicesByPlacement = <
  T extends { placements: Array<{ pageSlug: string; position: number }> },
>(
  services: T[],
  pageSlug?: string,
) =>
  [...services].sort(
    (left, right) =>
      (left.placements.find((placement) => placement.pageSlug === pageSlug)
        ?.position ?? 0) -
      (right.placements.find((placement) => placement.pageSlug === pageSlug)
        ?.position ?? 0),
  );

const imageUrlSchema = z
  .string()
  .trim()
  .min(1, "Укажите корректное изображение")
  .refine(
    (value) => value.startsWith("/api/media/") || /^https?:\/\//.test(value),
    "Ссылка на изображение должна быть адресом медиафайла",
  );

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
    response.json({
      services: sortServicesByPlacement(
        services,
        String(request.query.page ?? ""),
      ),
    });
  });
  router.get("/sections", async (request, response) => {
    const sections = await database.client.serviceSection.findMany({
      where: { pageSlug: String(request.query.page ?? "") },
      include: {
        services: {
          where: { status: "published" },
          include: {
            placements: true,
            variants: {
              where: { active: true },
              orderBy: { price: "asc" },
            },
          },
        },
      },
      orderBy: { blockNumber: "asc" },
    });
    response.json({
      sections: sections.map((section) => ({
        ...section,
        services: sortServicesByPlacement(section.services, section.pageSlug),
      })),
    });
  });
  router.get("/:serviceId/availability", async (request, response) => {
    const variantId = String(request.query.variantId ?? "");
    const date = String(request.query.date ?? "");
    const quantity = Math.max(1, Number(request.query.quantity ?? 1));
    const variant = await database.client.serviceVariant.findFirst({
      where: {
        id: variantId,
        serviceId: request.params.serviceId,
        active: true,
      },
    });
    if (!variant)
      return response
        .status(404)
        .json({ error: { code: "VARIANT_UNAVAILABLE" } });
    response.json({
      blocks: await listServiceAvailability(
        database.client,
        request.params.serviceId,
        variant,
        date,
        quantity,
      ),
    });
  });
  router.post("/orders", async (request, response) => {
    const input = orderSchema.parse(request.body);
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
        (item) =>
          !isProductVariant(byId.get(item.variantId)!.name) && !item.startsAt,
      )
    )
      return response.status(400).json({
        error: {
          code: "BOOKING_SLOT_REQUIRED",
          message: "Для каждой услуги выберите дату и слот.",
        },
      });
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
    for (const item of input.items) {
      const variant = byId.get(item.variantId)!;
      if (isProductVariant(variant.name)) continue;
      const startsAt = new Date(item.startsAt!);
      if (
        Number.isNaN(startsAt.getTime()) ||
        !(await isServiceSlotAvailable(
          database.client,
          variant.serviceId,
          variant,
          startsAt,
          item.quantity,
        ))
      )
        return response.status(400).json({
          error: {
            code: "BOOKING_SLOT_UNAVAILABLE",
            message: "Выбранное время больше недоступно. Выберите другой слот.",
          },
        });
    }
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
              ...(item.startsAt && !isProductVariant(variant.name)
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
  admin.get("/sections", async (_request, response) => {
    const sections = await database.client.serviceSection.findMany({
      include: {
        services: { include: { variants: true, placements: true } },
      },
      orderBy: [{ pageSlug: "asc" }, { blockNumber: "asc" }],
    });
    response.json({
      sections: sections.map((section) => ({
        ...section,
        services: sortServicesByPlacement(section.services, section.pageSlug),
      })),
    });
  });
  admin.post("/sections", async (request, response) => {
    const input = z
      .object({
        name: z.string().min(1),
        pageSlug: z.string().min(1),
        heading: z.string().min(1),
        subheading: z.string().optional(),
        blockNumber: z.number().int().positive(),
      })
      .parse(request.body);
    response.status(201).json({
      section: await database.client.serviceSection.create({ data: input }),
    });
  });
  admin.put("/sections/:sectionId", async (request, response) => {
    const input = z
      .object({
        name: z.string().min(1),
        pageSlug: z.string().min(1),
        heading: z.string().min(1),
        subheading: z.string().nullable(),
        blockNumber: z.number().int().positive(),
      })
      .parse(request.body);
    response.json({
      section: await database.client.serviceSection.update({
        where: { id: request.params.sectionId },
        data: input,
      }),
    });
  });
  admin.put("/sections/:sectionId/reorder", async (request, response) => {
    const input = z
      .object({ serviceIds: z.array(z.string().uuid()).min(1) })
      .parse(request.body);
    const section = await database.client.serviceSection.findUnique({
      where: { id: request.params.sectionId },
      select: { id: true, pageSlug: true, services: { select: { id: true } } },
    });
    if (
      !section ||
      section.services.length !== input.serviceIds.length ||
      new Set(section.services.map((service) => service.id)).size !==
        new Set(input.serviceIds).size ||
      input.serviceIds.some(
        (id) => !section.services.some((service) => service.id === id),
      )
    ) {
      return response.status(400).json({
        error: { message: "Укажите все карточки раздела в новом порядке" },
      });
    }
    await database.client.$transaction(
      input.serviceIds.map((serviceId, position) =>
        database.client.servicePagePlacement.upsert({
          where: {
            serviceId_pageSlug: { serviceId, pageSlug: section.pageSlug },
          },
          create: { serviceId, pageSlug: section.pageSlug, position },
          update: { position },
        }),
      ),
    );
    response.json({ serviceIds: input.serviceIds });
  });
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
        imageUrl: imageUrlSchema.nullable().optional(),
        status: z.enum(["draft", "published", "archived"]).default("draft"),
        sectionId: z.string().uuid().optional(),
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
        imageUrl: imageUrlSchema.nullable().optional(),
        status: z.enum(["draft", "published", "archived"]),
        sectionId: z.string().uuid().optional(),
      })
      .parse(request.body);
    response.json({
      service: await database.client.service.update({
        where: { id: request.params.serviceId },
        data: input,
      }),
    });
  });
  admin.delete("/catalog/:serviceId", async (request, response) => {
    await database.client.service.delete({
      where: { id: request.params.serviceId },
    });
    response.status(204).end();
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
          description: z.string().nullable().optional(),
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
  admin.delete(
    "/catalog/:serviceId/variants/:variantId",
    async (request, response) => {
      const variant = await database.client.serviceVariant.findFirst({
        where: {
          id: request.params.variantId,
          serviceId: request.params.serviceId,
        },
        select: { id: true },
      });
      if (!variant)
        return response.status(404).json({ error: "VARIANT_NOT_FOUND" });
      await database.client.serviceVariant.delete({
        where: { id: variant.id },
      });
      response.status(204).end();
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
