import { Router } from "express";
import { z } from "zod";

import type { Database } from "../../lib/database/database.js";
import {
  createRequireAdmin,
  createRequireAdminPermission,
} from "../admin-auth/admin-auth.middleware.js";
import { createAdminAuthRepository } from "../admin-auth/admin-auth.repository.js";
import { createAdminAuthService } from "../admin-auth/admin-auth.service.js";
import type { YooKassaClient, YooPayment } from "../booking/yookassa.client.js";
import { hashGuestToken, readGuestToken } from "../guest-auth/guest-session.js";
import {
  isProductVariant,
  isServiceSlotAvailable,
  listServiceAvailability,
  listServiceAvailabilityDetails,
  lockServiceAvailability,
  lockServiceAvailabilityForVariants,
} from "./service-availability.js";
import {
  expireServicePaymentHolds,
  reconcileServicePayment,
  servicePaymentDeadline,
  servicePaymentReturnUrl,
} from "./service-payments.js";

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

const serializeAdminVariant = (variant: object) => {
  const resourceEntries = (
    variant as {
      resources?: Array<{
        resourceId: string;
        quantity: number;
        resource: { id: string; name: string; totalUnits: number };
      }>;
    }
  ).resources;
  return {
    ...variant,
    resources: (resourceEntries ?? []).map(
      ({ resourceId, quantity, resource }) => ({
        resourceId,
        quantity,
        resource,
      }),
    ),
  };
};

const validateVariantResources = async (
  database: Database,
  resources: Array<{ resourceId: string; quantity: number }>,
) => {
  const resourceIds = [
    ...new Set(resources.map(({ resourceId }) => resourceId)),
  ];
  const records = await database.client.serviceResource.findMany({
    where: { id: { in: resourceIds } },
    select: { id: true, name: true, totalUnits: true },
  });
  const byId = new Map(records.map((resource) => [resource.id, resource]));
  return resources.find((assignment) => {
    const resource = byId.get(assignment.resourceId);
    return !resource || assignment.quantity > resource.totalUnits;
  });
};

const imageUrlSchema = z
  .string()
  .trim()
  .min(1, "Укажите корректное изображение")
  .refine(
    (value) => value.startsWith("/api/media/") || /^https?:\/\//.test(value),
    "Ссылка на изображение должна быть адресом медиафайла",
  );

const orderSchema = z.object({
  checkoutRequestId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  email: z.string().email(),
  phone: z.string().trim().min(7).max(32),
  returnUrl: z.string().url(),
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

const isAllowedReturnUrl = (
  value: string,
  allowedOrigins: readonly string[],
  requestOrigin?: string,
) => {
  try {
    const origin = new URL(value).origin;
    return origin === requestOrigin || allowedOrigins.includes(origin);
  } catch {
    return false;
  }
};

export const createServicesRouter = (
  database: Database,
  yookassa: YooKassaClient,
  allowedReturnOrigins: readonly string[],
): Router => {
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
        variants: {
          where: { active: true },
          orderBy: { price: "asc" },
          include: { resources: { include: { resource: true } } },
        },
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
              include: { resources: { include: { resource: true } } },
            },
          },
        },
      },
      orderBy: { blockNumber: "asc" },
    });
    response.json({
      sections: sections.map((section) => ({
        ...section,
        services: sortServicesByPlacement(
          section.services.map((service) => ({
            ...service,
            variants: service.variants.map(serializeAdminVariant),
          })),
          section.pageSlug,
        ),
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
      include: { resources: { include: { resource: true } } },
    });
    if (!variant)
      return response
        .status(404)
        .json({ error: { code: "VARIANT_UNAVAILABLE" } });
    const availability = await listServiceAvailabilityDetails(
      database.client,
      request.params.serviceId,
      variant,
      date,
      quantity,
    );
    response.json({
      blocks: availability.available,
      occupiedBlocks: availability.occupied,
    });
  });
  router.post("/orders", async (request, response) => {
    const parsed = orderSchema.safeParse(request.body);
    if (!parsed.success)
      return response.status(400).json({
        error: {
          code: "INVALID_ORDER",
          message: "Проверьте данные заказа и выбранные позиции.",
          details: parsed.error.flatten(),
        },
      });
    const input = parsed.data;
    if (
      !isAllowedReturnUrl(
        input.returnUrl,
        allowedReturnOrigins,
        request.header("origin") ?? undefined,
      )
    )
      return response.status(400).json({
        error: {
          code: "RETURN_URL_NOT_ALLOWED",
          message: "Адрес возврата после оплаты не разрешён.",
        },
      });
    await expireServicePaymentHolds(database.client, yookassa);

    let order = await database.client.serviceOrder.findUnique({
      where: { checkoutRequestId: input.checkoutRequestId },
      include: {
        items: {
          include: {
            booking: true,
            service: true,
            variant: true,
          },
        },
        paymentAttempts: { orderBy: { createdAt: "desc" } },
      },
    });

    if (order && order.status !== "awaiting_payment") {
      const attempt = order.paymentAttempts[0];
      return response.json({
        orderId: order.id,
        paymentId: attempt?.externalId ?? null,
        paymentStatus: order.paymentStatus,
        status: order.status,
        total: order.total.toString(),
        currency: order.currency,
        paymentUrl: attempt?.confirmationUrl ?? null,
      });
    }

    const token = readGuestToken(request);
    if (!order) {
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
      let userId =
        session?.userId ??
        (
          await database.client.guestUser.findFirst({
            where: {
              email: {
                equals: input.email.trim().toLowerCase(),
                mode: "insensitive",
              },
            },
            select: { id: true },
          })
        )?.id;
      if (!userId) {
        const email = input.email.trim().toLowerCase();
        const user = await database.client.guestUser.upsert({
          where: { phone: `email:${email}` },
          create: { email, phone: `email:${email}`, fullName: input.name },
          update: { email },
          select: { id: true },
        });
        userId = user.id;
      }

      const normalizedItems = [
        ...input.items.reduce((items, item) => {
          const key = `${item.variantId}:${item.startsAt ?? ""}`;
          const existing = items.get(key);
          items.set(key, {
            ...item,
            quantity: (existing?.quantity ?? 0) + item.quantity,
          });
          return items;
        }, new Map<string, (typeof input.items)[number]>()),
      ].map(([, item]) => item);
      const variantIds = [
        ...new Set(normalizedItems.map((item) => item.variantId)),
      ];
      const variants = await database.client.serviceVariant.findMany({
        where: { id: { in: variantIds }, active: true },
        include: { service: true, resources: { include: { resource: true } } },
      });
      if (variants.length !== variantIds.length)
        return response
          .status(400)
          .json({ error: { code: "VARIANT_UNAVAILABLE" } });
      const byId = new Map(variants.map((variant) => [variant.id, variant]));
      if (
        normalizedItems.some(
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
        normalizedItems.some(
          (item) => item.quantity > byId.get(item.variantId)!.capacity,
        )
      )
        return response.status(400).json({
          error: {
            code: "CAPACITY_EXCEEDED",
            message: "Количество гостей превышает вместимость варианта.",
          },
        });
      const total = normalizedItems.reduce(
        (sum, item) =>
          sum + Number(byId.get(item.variantId)!.price) * item.quantity,
        0,
      );
      const deadline = servicePaymentDeadline();
      order = await database.client
        .$transaction(async (transaction) => {
          await lockServiceAvailabilityForVariants(
            transaction,
            normalizedItems
              .filter(
                (item) => !isProductVariant(byId.get(item.variantId)!.name),
              )
              .map((item) => ({
                serviceId: byId.get(item.variantId)!.serviceId,
                variant: byId.get(item.variantId)!,
              })),
          );
          for (const item of normalizedItems) {
            const variant = byId.get(item.variantId)!;
            if (isProductVariant(variant.name)) continue;
            const startsAt = new Date(item.startsAt!);
            if (
              Number.isNaN(startsAt.getTime()) ||
              !(await isServiceSlotAvailable(
                transaction as unknown as typeof database.client,
                variant.serviceId,
                variant,
                startsAt,
                item.quantity,
              ))
            ) {
              throw new Error("BOOKING_SLOT_UNAVAILABLE");
            }
          }
          const created = await transaction.serviceOrder.create({
            data: {
              checkoutRequestId: input.checkoutRequestId,
              email: input.email,
              name: input.name,
              paymentDeadlineAt: deadline,
              paymentProvider: "yookassa",
              paymentStatus: "pending",
              phone: input.phone,
              status: "awaiting_payment",
              total,
              userId,
              items: {
                create: normalizedItems.map((item) => {
                  const variant = byId.get(item.variantId)!;
                  return {
                    quantity: item.quantity,
                    serviceId: variant.serviceId,
                    unitPrice: variant.price,
                    variantId: variant.id,
                    ...(item.startsAt && !isProductVariant(variant.name)
                      ? {
                          booking: {
                            create: {
                              bookingSource: "online",
                              endsAt: new Date(
                                new Date(item.startsAt).getTime() +
                                  (variant.durationMin ?? 60) * 60000,
                              ),
                              holdExpiresAt: deadline,
                              serviceId: variant.serviceId,
                              startsAt: new Date(item.startsAt),
                              status: "held",
                              variantId: variant.id,
                            },
                          },
                        }
                      : {}),
                  };
                }),
              },
            },
          });
          await transaction.paymentAttempt.create({
            data: {
              amount: total,
              currency: created.currency,
              idempotencyKey: `service-order-${created.id}`,
              orderId: created.id,
              provider: "yookassa",
              status: "not_started",
            },
          });
          return transaction.serviceOrder.findUniqueOrThrow({
            where: { id: created.id },
            include: {
              items: {
                include: { service: true, variant: true, booking: true },
              },
              paymentAttempts: { orderBy: { createdAt: "desc" } },
            },
          });
        })
        .catch((error: unknown) => {
          if (
            error instanceof Error &&
            error.message === "BOOKING_SLOT_UNAVAILABLE"
          )
            return null;
          throw error;
        });
      if (!order)
        return response.status(409).json({
          error: {
            code: "BOOKING_SLOT_UNAVAILABLE",
            message: "Выбранное время уже занято. Выберите другой слот.",
          },
        });
    }

    const attempt = order.paymentAttempts[0];
    if (!attempt)
      return response.status(500).json({
        error: {
          code: "PAYMENT_ATTEMPT_NOT_FOUND",
          message: "Не удалось подготовить оплату.",
        },
      });

    let payment: YooPayment;
    try {
      payment = attempt.externalId
        ? await yookassa.getPayment(attempt.externalId)
        : await yookassa.createPayment({
            amount: order.total.toString(),
            bookingId: undefined,
            capture: true,
            currency: order.currency,
            customer: { email: order.email, phone: order.phone },
            description: `Оплата услуг ${order.id}`,
            idempotenceKey:
              attempt.idempotencyKey ?? `service-order-${order.id}`,
            metadata: { serviceOrderId: order.id },
            receiptItems: order.items.map((item) => ({
              amount: Number(item.unitPrice).toFixed(2),
              description: `${item.service.name} — ${item.variant.name}`,
              paymentSubject: isProductVariant(item.variant.name)
                ? "commodity"
                : "service",
              quantity: String(item.quantity),
            })),
            returnUrl: servicePaymentReturnUrl(input.returnUrl, order.id),
          });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Платёжный сервис недоступен.";
      await database.client.$transaction([
        database.client.paymentAttempt.update({
          data: { lastError: message, status: "failed" },
          where: { id: attempt.id },
        }),
        database.client.serviceOrder.update({
          data: {
            paymentError: message,
            paymentStatus: "pending",
            status: "awaiting_payment",
          },
          where: { id: order.id },
        }),
      ]);
      return response.status(502).json({
        error: {
          code: "PAYMENT_CREATION_FAILED",
          message:
            "Не удалось создать платёж. Временная бронь сохранена, повторите попытку.",
        },
      });
    }

    await database.client.paymentAttempt.update({
      data: {
        amount: payment.amount.value,
        confirmationUrl: payment.confirmation?.confirmation_url ?? null,
        currency: payment.amount.currency,
        externalId: payment.id,
        status: payment.status,
      },
      where: { id: attempt.id },
    });
    const reconciliation =
      payment.status === "succeeded" && payment.paid
        ? await reconcileServicePayment(database.client, yookassa, payment)
        : null;
    const current = await database.client.serviceOrder.findUnique({
      where: { id: order.id },
      include: { paymentAttempts: { orderBy: { createdAt: "desc" } } },
    });
    const currentAttempt = current?.paymentAttempts[0] ?? attempt;
    response
      .status(order.checkoutRequestId === input.checkoutRequestId ? 200 : 201)
      .json({
        orderId: order.id,
        paymentId: payment.id,
        paymentStatus: current?.paymentStatus ?? payment.status,
        paymentUrl: payment.confirmation?.confirmation_url ?? null,
        reconciliation: reconciliation?.kind ?? null,
        status: current?.status ?? order.status,
        total: order.total.toString(),
        currency: order.currency,
        paymentAttemptStatus: currentAttempt.status,
      });
  });
  router.get("/orders/:orderId/status", async (request, response) => {
    await expireServicePaymentHolds(database.client, yookassa);
    let order = await database.client.serviceOrder.findUnique({
      where: { id: request.params.orderId },
      include: {
        items: { include: { booking: true } },
        paymentAttempts: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!order)
      return response.status(404).json({
        error: { code: "ORDER_NOT_FOUND", message: "Заказ не найден." },
      });
    const attempt = order.paymentAttempts[0];
    if (
      attempt?.externalId &&
      order.paymentStatus === "pending" &&
      order.status === "awaiting_payment"
    ) {
      try {
        const payment = await yookassa.getPayment(attempt.externalId);
        await reconcileServicePayment(database.client, yookassa, payment);
        order = await database.client.serviceOrder.findUnique({
          where: { id: order.id },
          include: {
            items: { include: { booking: true } },
            paymentAttempts: { orderBy: { createdAt: "desc" } },
          },
        });
      } catch {
        // The webhook remains the source of truth if the provider is temporarily unavailable.
      }
    }
    response.json({
      orderId: order!.id,
      paymentStatus: order!.paymentStatus,
      status: order!.status,
      total: order!.total.toString(),
      currency: order!.currency,
      paymentError: order!.paymentError,
      paymentUrl: order!.paymentAttempts[0]?.confirmationUrl ?? null,
      bookings: order!.items
        .filter((item) => item.booking)
        .map((item) => ({
          id: item.booking!.id,
          startsAt: item.booking!.startsAt,
          endsAt: item.booking!.endsAt,
          status: item.booking!.status,
        })),
    });
  });
  router.post("/payments/webhook", async (request, response) => {
    const body = request.body as {
      event?: unknown;
      object?: { id?: unknown };
    };
    if (
      body.event !== "payment.succeeded" &&
      body.event !== "payment.canceled" &&
      body.event !== "payment.waiting_for_capture"
    )
      return response.sendStatus(204);
    const paymentId =
      typeof body.object?.id === "string" ? body.object.id : null;
    if (paymentId)
      await reconcileServicePayment(
        database.client,
        yookassa,
        await yookassa.getPayment(paymentId),
      );
    response.sendStatus(204);
  });
  const admin = Router();
  admin.use(
    createRequireAdmin(
      createAdminAuthService(createAdminAuthRepository(database)),
    ),
  );
  admin.use(createRequireAdminPermission("dashboard.access"));
  admin.get("/managers", async (_request, response) => {
    const managers = await database.client.adminUser.findMany({
      where: { status: "active" },
      select: { id: true, displayName: true, email: true },
      orderBy: { displayName: "asc" },
    });
    response.json({ managers, currentAdminId: response.locals.admin.id });
  });
  admin.get("/sections", async (_request, response) => {
    const sections = await database.client.serviceSection.findMany({
      include: {
        services: {
          include: {
            variants: {
              include: { resources: { include: { resource: true } } },
            },
            placements: true,
          },
        },
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
    const services = await database.client.service.findMany({
      include: {
        variants: { include: { resources: { include: { resource: true } } } },
        placements: true,
        rules: true,
      },
    });
    response.json({
      services: services.map((service) => ({
        ...service,
        variants: service.variants.map(serializeAdminVariant),
      })),
    });
  });
  admin.get("/resources", async (_request, response) => {
    const resources = await database.client.serviceResource.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { variants: true } } },
    });
    response.json({
      resources: resources.map(({ _count, ...resource }) => ({
        ...resource,
        assignedVariantsCount: _count.variants,
      })),
    });
  });
  admin.post("/resources", async (request, response) => {
    const input = z
      .object({
        name: z.string().trim().min(1).max(120),
        totalUnits: z.number().int().positive(),
      })
      .parse(request.body);
    response.status(201).json({
      resource: await database.client.serviceResource.create({ data: input }),
    });
  });
  admin.put("/resources/:resourceId", async (request, response) => {
    const input = z
      .object({
        name: z.string().trim().min(1).max(120),
        totalUnits: z.number().int().positive(),
      })
      .parse(request.body);
    const resource = await database.client.serviceResource.findUnique({
      where: { id: request.params.resourceId },
      select: { id: true, variants: { select: { quantity: true } } },
    });
    if (!resource)
      return response.status(404).json({
        error: { code: "RESOURCE_NOT_FOUND", message: "Ресурс не найден." },
      });
    const assignedQuantity = Math.max(
      0,
      ...resource.variants.map(({ quantity }) => quantity),
    );
    if (input.totalUnits < assignedQuantity) {
      return response.status(409).json({
        error: {
          code: "RESOURCE_TOTAL_UNITS_BELOW_ASSIGNMENT",
          message: `Количество ресурса не может быть меньше уже назначенного услугам значения (${assignedQuantity}).`,
        },
      });
    }
    response.json({
      resource: await database.client.serviceResource.update({
        where: { id: request.params.resourceId },
        data: input,
      }),
    });
  });
  admin.delete("/resources/:resourceId", async (request, response) => {
    const resource = await database.client.serviceResource.findUnique({
      where: { id: request.params.resourceId },
      select: {
        id: true,
        variants: {
          select: {
            variant: {
              select: { name: true, service: { select: { name: true } } },
            },
          },
        },
      },
    });
    if (!resource)
      return response.status(404).json({
        error: { code: "RESOURCE_NOT_FOUND", message: "Ресурс не найден." },
      });
    if (resource.variants.length) {
      return response.status(409).json({
        error: {
          code: "RESOURCE_IN_USE",
          message:
            "Ресурс назначен вариантам услуг. Сначала снимите его с этих вариантов.",
        },
      });
    }
    await database.client.serviceResource.delete({
      where: { id: request.params.resourceId },
    });
    response.status(204).end();
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
        resources: z
          .array(
            z.object({
              resourceId: z.string().uuid(),
              quantity: z.number().int().positive(),
            }),
          )
          .default([]),
      })
      .parse(request.body);
    const invalidResource = await validateVariantResources(
      database,
      input.resources,
    );
    if (invalidResource) {
      return response.status(400).json({
        error: "RESOURCE_QUANTITY_EXCEEDS_TOTAL_UNITS",
        message: "Количество ресурса не может превышать доступное количество",
        resourceId: invalidResource.resourceId,
      });
    }
    response.status(201).json({
      variant: serializeAdminVariant(
        await database.client.serviceVariant.create({
          data: {
            ...input,
            serviceId: request.params.serviceId,
            resources: { create: input.resources },
          },
        }),
      ),
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
          resources: z
            .array(
              z.object({
                resourceId: z.string().uuid(),
                quantity: z.number().int().positive(),
              }),
            )
            .default([]),
        })
        .parse(request.body);
      const invalidResource = await validateVariantResources(
        database,
        input.resources,
      );
      if (invalidResource) {
        return response.status(400).json({
          error: "RESOURCE_QUANTITY_EXCEEDS_TOTAL_UNITS",
          message: "Количество ресурса не может превышать доступное количество",
          resourceId: invalidResource.resourceId,
        });
      }
      response.json({
        variant: serializeAdminVariant(
          await database.client.serviceVariant.update({
            where: { id: request.params.variantId },
            data: {
              ...input,
              resources: { deleteMany: {}, create: input.resources },
            },
          }),
        ),
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
      where: {
        startsAt: { gte: from, lte: to },
        status: { not: "cancelled" },
      },
      include: {
        service: true,
        variant: { include: { resources: { include: { resource: true } } } },
        orderItem: { include: { order: true } },
        createdByAdmin: {
          select: { id: true, displayName: true, email: true },
        },
        responsibleManager: {
          select: { id: true, displayName: true, email: true },
        },
      },
      orderBy: { startsAt: "asc" },
    });
    response.json({ bookings });
  });
  admin.put("/bookings/:bookingId/payment", async (request, response) => {
    const input = z
      .object({ paymentStatus: z.enum(["pending", "succeeded"]) })
      .parse(request.body);
    const booking = await database.client.serviceBooking.findUnique({
      where: { id: request.params.bookingId },
      select: { orderItem: { select: { orderId: true } } },
    });
    if (!booking)
      return response.status(404).json({
        error: { code: "BOOKING_NOT_FOUND", message: "Запись не найдена." },
      });
    await database.client.serviceOrder.update({
      where: { id: booking.orderItem.orderId },
      data: {
        paymentStatus: input.paymentStatus,
        paidAt: input.paymentStatus === "succeeded" ? new Date() : null,
      },
    });
    response.json({
      bookingId: request.params.bookingId,
      paymentStatus: input.paymentStatus,
    });
  });
  admin.post("/manual-bookings", async (request, response) => {
    const input = z
      .object({
        name: z.string().trim().min(1).max(120),
        phone: z.string().trim().min(7).max(32),
        email: z.string().email().optional().or(z.literal("")),
        variantId: z.string().uuid(),
        startsAt: z.string().datetime(),
        responsibleManagerId: z.string().uuid(),
        paymentStatus: z.enum(["pending", "succeeded"]),
      })
      .parse(request.body);
    const variant = await database.client.serviceVariant.findFirst({
      where: { id: input.variantId, active: true },
      include: { resources: { include: { resource: true } } },
    });
    if (!variant)
      return response
        .status(404)
        .json({ error: { code: "VARIANT_UNAVAILABLE" } });
    const startsAt = new Date(input.startsAt);
    const responsibleManager = await database.client.adminUser.findFirst({
      where: { id: input.responsibleManagerId, status: "active" },
      select: { id: true },
    });
    if (!responsibleManager)
      return response.status(400).json({
        error: {
          code: "RESPONSIBLE_MANAGER_UNAVAILABLE",
          message: "Выбранный ответственный менеджер недоступен.",
        },
      });
    const email = input.email?.trim().toLowerCase() || "";
    const order = await database.client
      .$transaction(async (transaction) => {
        await lockServiceAvailability(
          transaction as typeof database.client,
          variant.serviceId,
          variant,
        );
        if (
          !(await isServiceSlotAvailable(
            transaction as typeof database.client,
            variant.serviceId,
            variant,
            startsAt,
            1,
          ))
        )
          throw new Error("BOOKING_SLOT_UNAVAILABLE");
        const existingByEmail = email
          ? await transaction.guestUser.findFirst({
              where: { email: { equals: email, mode: "insensitive" } },
            })
          : null;
        const user = existingByEmail
          ? await transaction.guestUser.update({
              where: { id: existingByEmail.id },
              data: { email: email || null, fullName: input.name },
            })
          : await transaction.guestUser.upsert({
              where: { phone: input.phone },
              create: {
                email: email || null,
                phone: input.phone,
                fullName: input.name,
              },
              update: { email: email || null, fullName: input.name },
            });
        return transaction.serviceOrder.create({
          data: {
            name: input.name,
            email,
            phone: input.phone,
            userId: user.id,
            paymentStatus: input.paymentStatus,
            paidAt: input.paymentStatus === "succeeded" ? new Date() : null,
            status: input.paymentStatus === "succeeded" ? "paid" : "new",
            total: 0,
            items: {
              create: {
                serviceId: variant.serviceId,
                variantId: variant.id,
                quantity: 1,
                unitPrice: 0,
                booking: {
                  create: {
                    serviceId: variant.serviceId,
                    variantId: variant.id,
                    startsAt,
                    endsAt: new Date(
                      startsAt.getTime() + (variant.durationMin ?? 60) * 60000,
                    ),
                    status: "confirmed",
                    bookingSource: "manual",
                    createdByAdminId: response.locals.admin.id,
                    responsibleManagerId: input.responsibleManagerId,
                  },
                },
              },
            },
          },
          select: { id: true },
        });
      })
      .catch((error: unknown) => {
        if (
          error instanceof Error &&
          error.message === "BOOKING_SLOT_UNAVAILABLE"
        )
          return null;
        throw error;
      });
    if (!order)
      return response.status(409).json({
        error: {
          code: "BOOKING_SLOT_UNAVAILABLE",
          message: variant.resources.length
            ? "Выбранное время недоступно: не хватает назначенного ресурса на всю длительность услуги."
            : "Выбранное время уже занято.",
        },
      });
    response.status(201).json({ orderId: order.id });
  });
  router.use("/admin", admin);
  return router;
};
