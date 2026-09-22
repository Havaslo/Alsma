import { randomUUID } from "node:crypto";

import type { PrismaClient } from "../../generated/prisma/client.js";
import type {
  YooKassaClient,
  YooPayment,
  YooRefund,
} from "../booking/yookassa.client.js";
import {
  isProductVariant,
  isServiceSlotAvailable,
  lockServiceAvailabilityForVariants,
} from "./service-availability.js";

export const SERVICE_HOLD_MINUTES = 10;

const asMoney = (value: string | number) => Number(value).toFixed(2);

export const servicePaymentReturnUrl = (value: string, orderId: string) => {
  const url = new URL(value);
  url.searchParams.set("serviceOrderId", orderId);
  url.searchParams.set("payment", "return");
  return url.toString();
};

export const servicePaymentDeadline = (now = new Date()) =>
  new Date(now.getTime() + SERVICE_HOLD_MINUTES * 60_000);

const serviceOrderResult = (order: {
  cancellationStatus: string;
  id: string;
  paymentError: string | null;
  paymentStatus: string;
  refundError: string | null;
  refundStatus: string;
  status: string;
}) => ({
  cancellationStatus: order.cancellationStatus,
  orderId: order.id,
  paymentError: order.paymentError,
  paymentStatus: order.paymentStatus,
  refundError: order.refundError,
  refundStatus: order.refundStatus,
  status: order.status,
});

export const reconcileServiceRefund = async (
  database: PrismaClient,
  refund: YooRefund,
) => {
  const attempt = await database.paymentAttempt.findFirst({
    where: { externalId: refund.paymentId },
  });
  if (!attempt) return { kind: "ignored" as const };

  if (refund.status === "succeeded") {
    await database.$transaction([
      database.paymentAttempt.update({
        data: { refundedAt: new Date(), lastError: null, status: "refunded" },
        where: { id: attempt.id },
      }),
      database.serviceOrder.update({
        data: {
          cancellationStatus: "succeeded",
          cancelledAt: new Date(),
          paymentError: null,
          paymentStatus: "refunded",
          refundError: null,
          refundId: refund.id,
          refundStatus: "succeeded",
          refundedAt: new Date(),
          status: "refunded",
        },
        where: { id: attempt.orderId },
      }),
    ]);
    return { kind: "refunded" as const, orderId: attempt.orderId };
  }

  if (refund.status === "canceled" || refund.status === "failed") {
    const message = "ЮKassa не завершила возврат оплаты.";
    await database.$transaction([
      database.paymentAttempt.update({
        data: { lastError: message, status: "refund_pending" },
        where: { id: attempt.id },
      }),
      database.serviceOrder.update({
        data: {
          cancellationStatus: "failed",
          paymentError: message,
          refundError: message,
          refundId: refund.id,
          refundStatus: "failed",
          status: "refund_pending",
        },
        where: { id: attempt.orderId },
      }),
    ]);
    return { kind: "refund_failed" as const, orderId: attempt.orderId };
  }

  await database.$transaction([
    database.paymentAttempt.update({
      data: { status: "refund_pending" },
      where: { id: attempt.id },
    }),
    database.serviceOrder.update({
      data: {
        cancellationStatus: "processing",
        refundId: refund.id,
        refundStatus: "pending",
        status: "refund_pending",
      },
      where: { id: attempt.orderId },
    }),
  ]);
  return { kind: "refund_pending" as const, orderId: attempt.orderId };
};

export const resumeServicePayment = async (
  database: PrismaClient,
  yookassa: YooKassaClient,
  input: { orderId: string; returnUrl: string; userId: string },
) => {
  await expireServicePaymentHolds(database, yookassa);
  let order = await database.serviceOrder.findFirst({
    where: { id: input.orderId, userId: input.userId },
    include: {
      items: { include: { service: true, variant: true } },
      paymentAttempts: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!order) return { kind: "not_found" as const };
  if (order.status === "paid")
    return { kind: "completed" as const, orderId: order.id };
  if (order.status !== "awaiting_payment")
    return { kind: "not_available" as const, status: order.status };
  if (order.paymentDeadlineAt && order.paymentDeadlineAt <= new Date())
    return { kind: "expired" as const };

  let attempt = order.paymentAttempts[0];
  if (!attempt) return { kind: "not_available" as const, status: order.status };

  if (attempt.externalId) {
    const payment = await yookassa.getPayment(attempt.externalId);
    if (payment.status === "succeeded" && payment.paid) {
      await reconcileServicePayment(database, yookassa, payment);
      return { kind: "completed" as const, orderId: order.id };
    }
    if (
      payment.status !== "canceled" &&
      payment.confirmation?.confirmation_url
    ) {
      await database.paymentAttempt.update({
        data: { status: payment.status },
        where: { id: attempt.id },
      });
      return {
        kind: "ready" as const,
        orderId: order.id,
        paymentUrl: payment.confirmation.confirmation_url,
      };
    }

    if (payment.status === "canceled") {
      attempt = await database.paymentAttempt.create({
        data: {
          amount: order.total,
          currency: order.currency,
          idempotencyKey: `service-order-${order.id}-${randomUUID()}`,
          orderId: order.id,
          provider: "yookassa",
          status: "not_started",
        },
      });
    }
  }

  let payment: YooPayment;
  try {
    payment = await yookassa.createPayment({
      amount: order.total.toString(),
      capture: true,
      currency: order.currency,
      customer: {
        email: order.email,
        fullName: order.name,
        phone: order.phone,
      },
      description: `Оплата услуг ${order.id}`,
      idempotenceKey: attempt.idempotencyKey ?? `service-order-${order.id}`,
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
    await database.paymentAttempt.update({
      data: { lastError: message, status: "failed" },
      where: { id: attempt.id },
    });
    return { kind: "provider_failed" as const, message };
  }

  await database.paymentAttempt.update({
    data: {
      amount: payment.amount.value,
      confirmationUrl: payment.confirmation?.confirmation_url ?? null,
      currency: payment.amount.currency,
      externalId: payment.id,
      lastError: null,
      status: payment.status,
    },
    where: { id: attempt.id },
  });
  const reconciliation =
    payment.status === "succeeded" && payment.paid
      ? await reconcileServicePayment(database, yookassa, payment)
      : null;
  order = await database.serviceOrder.findUnique({
    where: { id: order.id },
    include: {
      items: { include: { service: true, variant: true } },
      paymentAttempts: { orderBy: { createdAt: "desc" } },
    },
  });
  return {
    kind: reconciliation?.kind === "confirmed" ? "completed" : "ready",
    orderId: input.orderId,
    paymentUrl: payment.confirmation?.confirmation_url ?? null,
    status: order?.status ?? "awaiting_payment",
  } as const;
};

export const cancelServiceOrder = async (
  database: PrismaClient,
  yookassa: YooKassaClient,
  input: { orderId: string; reason?: string | null; userId: string },
) => {
  const order = await database.serviceOrder.findFirst({
    where: { id: input.orderId, userId: input.userId },
    include: {
      items: { include: { booking: true } },
      paymentAttempts: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!order) return { kind: "not_found" as const };

  if (order.status === "refunded" || order.status === "cancelled")
    return { kind: "already_done" as const, order: serviceOrderResult(order) };
  if (order.status === "refund_pending")
    return {
      kind: "already_processing" as const,
      order: serviceOrderResult(order),
    };
  if (order.status !== "awaiting_payment" && order.status !== "paid")
    return { kind: "not_cancellable" as const };

  const now = new Date();
  if (
    order.items.some(
      (item) => item.booking?.startsAt && item.booking.startsAt <= now,
    )
  )
    return { kind: "too_late" as const };

  const reason = input.reason?.trim() || null;
  const claimed = await database.$transaction(async (transaction) => {
    const current = await transaction.serviceOrder.findFirst({
      where: { id: input.orderId, userId: input.userId },
      include: { paymentAttempts: { orderBy: { createdAt: "desc" } } },
    });
    if (!current) return null;
    if (current.status === "refunded" || current.status === "cancelled")
      return current;
    if (current.status === "refund_pending") return current;

    const paid =
      current.status === "paid" && current.paymentStatus === "succeeded";
    await transaction.serviceOrder.update({
      data: {
        cancellationReason: reason,
        cancellationRequestedAt: new Date(),
        cancellationStatus: paid ? "processing" : "requested",
        paymentError: paid ? "Выполняется возврат оплаты." : null,
        paymentStatus: paid ? "succeeded" : "canceled",
        refundStatus: paid ? "pending" : "not_started",
        status: paid ? "refund_pending" : "cancelled",
      },
      where: { id: current.id },
    });
    await transaction.serviceBooking.updateMany({
      data: { holdExpiresAt: null, status: "cancelled" },
      where: {
        orderItem: { orderId: current.id },
        status: { in: ["held", "confirmed"] },
      },
    });
    return transaction.serviceOrder.findUniqueOrThrow({
      where: { id: current.id },
      include: { paymentAttempts: { orderBy: { createdAt: "desc" } } },
    });
  });

  if (!claimed) return { kind: "not_found" as const };
  if (
    claimed.status === "refunded" ||
    (claimed.status === "cancelled" &&
      claimed.cancellationStatus === "succeeded")
  )
    return {
      kind: "already_done" as const,
      order: serviceOrderResult(claimed),
    };
  if (
    claimed.status === "refund_pending" &&
    claimed.paymentStatus !== "succeeded"
  )
    return {
      kind: "already_processing" as const,
      order: serviceOrderResult(claimed),
    };

  const attempt = claimed.paymentAttempts[0];
  if (!attempt?.externalId) {
    if (claimed.status === "refund_pending") {
      const updated = await database.serviceOrder.update({
        data: {
          cancellationStatus: "failed",
          paymentError: "Не найден платёж для возврата.",
          refundError: "Не найден платёж для возврата.",
          refundStatus: "failed",
        },
        where: { id: claimed.id },
      });
      return {
        kind: "refund_failed" as const,
        order: serviceOrderResult(updated),
      };
    }
    const updated = await database.serviceOrder.update({
      data: {
        cancellationStatus: "succeeded",
        cancelledAt: new Date(),
        status: "cancelled",
      },
      where: { id: claimed.id },
    });
    return { kind: "cancelled" as const, order: serviceOrderResult(updated) };
  }

  let payment: YooPayment;
  try {
    payment = await yookassa.getPayment(attempt.externalId);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Не удалось проверить платёж.";
    const updated = await database.serviceOrder.update({
      data: {
        cancellationStatus: "failed",
        paymentError: message,
        refundError: claimed.status === "refund_pending" ? message : null,
        status:
          claimed.status === "refund_pending" ? "refund_pending" : "cancelled",
      },
      where: { id: claimed.id },
    });
    return {
      kind: "provider_failed" as const,
      order: serviceOrderResult(updated),
    };
  }

  if (payment.status === "succeeded" && payment.paid) {
    try {
      const refund = await yookassa.refundPayment({
        amount: payment.amount.value,
        currency: payment.amount.currency,
        description: `Возврат заказа услуг ${claimed.id}`,
        idempotenceKey: `service-refund-${claimed.id}`,
        paymentId: payment.id,
      });
      const reconciled = await reconcileServiceRefund(database, refund);
      const updated = await database.serviceOrder.findUniqueOrThrow({
        where: { id: claimed.id },
      });
      return {
        kind: reconciled.kind,
        order: serviceOrderResult(updated),
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Не удалось оформить возврат.";
      const updated = await database.serviceOrder.update({
        data: {
          cancellationStatus: "failed",
          paymentError: message,
          refundError: message,
          refundStatus: "failed",
          status: "refund_pending",
        },
        where: { id: claimed.id },
      });
      return {
        kind: "refund_failed" as const,
        order: serviceOrderResult(updated),
      };
    }
  }

  try {
    if (payment.status !== "canceled")
      await yookassa.cancelPayment(payment.id, `service-cancel-${claimed.id}`);
    const updated = await database.serviceOrder.update({
      data: {
        cancellationStatus: "succeeded",
        cancelledAt: new Date(),
        paymentError: null,
        paymentStatus: "canceled",
        status: "cancelled",
      },
      where: { id: claimed.id },
    });
    return { kind: "cancelled" as const, order: serviceOrderResult(updated) };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Не удалось отменить платёж.";
    const updated = await database.serviceOrder.update({
      data: {
        cancellationStatus: "failed",
        paymentError: message,
        status: "cancelled",
      },
      where: { id: claimed.id },
    });
    return {
      kind: "provider_failed" as const,
      order: serviceOrderResult(updated),
    };
  }
};

const updateBookings = async (
  database: PrismaClient,
  orderId: string,
  status: "cancelled" | "confirmed",
) => {
  await database.serviceBooking.updateMany({
    data: { holdExpiresAt: null, status },
    where: { orderItem: { orderId }, status: "held" },
  });
};

const markPaymentAttempt = async (
  database: PrismaClient,
  payment: YooPayment,
  status: string,
) => {
  await database.paymentAttempt.updateMany({
    data: {
      externalId: payment.id,
      status,
      amount: payment.amount.value,
      currency: payment.amount.currency,
    },
    where: { externalId: payment.id },
  });
};

export const reconcileServicePayment = async (
  database: PrismaClient,
  yookassa: YooKassaClient,
  payment: YooPayment,
) => {
  const orderId = payment.metadata?.serviceOrderId;
  if (!orderId) return { kind: "ignored" as const };

  const order = await database.serviceOrder.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          booking: true,
          service: true,
          variant: { include: { resources: { include: { resource: true } } } },
        },
      },
      paymentAttempts: true,
    },
  });
  if (!order) return { kind: "ignored" as const };

  const attempt =
    order.paymentAttempts.find((entry) => entry.externalId === payment.id) ??
    order.paymentAttempts.find((entry) => !entry.externalId);
  if (!attempt) return { kind: "ignored" as const };

  if (asMoney(order.total.toString()) !== asMoney(payment.amount.value)) {
    await database.serviceOrder.update({
      data: {
        paymentError: "Сумма платежа не совпадает с суммой заказа.",
        status: "payment_failed",
      },
      where: { id: order.id },
    });
    await database.paymentAttempt.update({
      data: {
        externalId: payment.id,
        lastError: "Сумма платежа не совпадает с суммой заказа.",
        status: "failed",
      },
      where: { id: attempt.id },
    });
    return { kind: "amount_mismatch" as const };
  }

  if (payment.status === "canceled") {
    await database.$transaction(async (transaction) => {
      await transaction.paymentAttempt.update({
        data: {
          cancelledAt: new Date(),
          externalId: payment.id,
          status: "canceled",
        },
        where: { id: attempt.id },
      });
      await transaction.serviceOrder.update({
        data: {
          paymentError: null,
          paymentStatus: "canceled",
          status: "payment_failed",
        },
        where: { id: order.id },
      });
      await transaction.serviceBooking.updateMany({
        data: { holdExpiresAt: null, status: "cancelled" },
        where: { orderItem: { orderId: order.id }, status: "held" },
      });
    });
    return { kind: "canceled" as const };
  }

  if (payment.status !== "succeeded" || !payment.paid) {
    await database.paymentAttempt.update({
      data: {
        amount: payment.amount.value,
        currency: payment.amount.currency,
        externalId: payment.id,
        status: payment.status,
      },
      where: { id: attempt.id },
    });
    return { kind: "pending" as const };
  }

  const result = await database.$transaction(async (transaction) => {
    const current = await transaction.serviceOrder.findUnique({
      where: { id: order.id },
      include: {
        items: {
          include: {
            booking: true,
            variant: {
              include: { resources: { include: { resource: true } } },
            },
          },
        },
      },
    });
    if (!current) return { kind: "ignored" as const };
    if (current.status === "paid" && current.paymentStatus === "succeeded")
      return { kind: "confirmed" as const };

    await lockServiceAvailabilityForVariants(
      transaction,
      current.items
        .filter((item) => item.booking && !isProductVariant(item.variant.name))
        .map((item) => ({
          serviceId: item.serviceId,
          variant: item.variant,
        })),
    );

    const now = new Date();
    const bookings = current.items
      .map((item) => ({ item, booking: item.booking }))
      .filter(
        (
          entry,
        ): entry is typeof entry & {
          booking: NonNullable<typeof entry.booking>;
        } => Boolean(entry.booking),
      );
    const holdsValid = bookings.every(
      ({ booking }) =>
        booking.status === "held" &&
        Boolean(booking.holdExpiresAt && booking.holdExpiresAt > now),
    );
    let available = holdsValid;
    if (available) {
      for (const { item, booking } of bookings) {
        if (isProductVariant(item.variant.name)) continue;
        if (
          !(await isServiceSlotAvailable(
            transaction as unknown as PrismaClient,
            item.serviceId,
            item.variant,
            booking.startsAt,
            item.quantity,
            booking.id,
          ))
        ) {
          available = false;
          break;
        }
      }
    }

    if (!available) {
      await transaction.paymentAttempt.update({
        data: {
          externalId: payment.id,
          lastError: "Временная бронь истекла или слот уже занят.",
          status: "refund_pending",
          amount: payment.amount.value,
          currency: payment.amount.currency,
        },
        where: { id: attempt.id },
      });
      await transaction.serviceOrder.update({
        data: {
          paymentError: "Слот уже недоступен, выполняется возврат оплаты.",
          paymentStatus: "succeeded",
          refundStatus: "pending",
          status: "refund_pending",
        },
        where: { id: current.id },
      });
      await transaction.serviceBooking.updateMany({
        data: { holdExpiresAt: null, status: "cancelled" },
        where: { orderItem: { orderId: current.id }, status: "held" },
      });
      return { kind: "refund" as const, orderId: current.id };
    }

    await transaction.paymentAttempt.update({
      data: {
        capturedAt: new Date(),
        externalId: payment.id,
        status: "succeeded",
        amount: payment.amount.value,
        currency: payment.amount.currency,
      },
      where: { id: attempt.id },
    });
    await transaction.serviceOrder.update({
      data: {
        paidAt: new Date(),
        paymentError: null,
        paymentStatus: "succeeded",
        status: "paid",
      },
      where: { id: current.id },
    });
    await transaction.serviceBooking.updateMany({
      data: { holdExpiresAt: null, status: "confirmed" },
      where: { orderItem: { orderId: current.id }, status: "held" },
    });
    return { kind: "confirmed" as const };
  });

  if (result.kind !== "refund") return result;
  try {
    const refund = await yookassa.refundPayment({
      amount: payment.amount.value,
      currency: payment.amount.currency,
      description: `Возврат заказа услуг ${result.orderId}`,
      idempotenceKey: `service-refund-${result.orderId}`,
      paymentId: payment.id,
    });
    await database.$transaction([
      database.paymentAttempt.update({
        data: { refundedAt: new Date(), lastError: null, status: "refunded" },
        where: { id: attempt.id },
      }),
      database.serviceOrder.update({
        data: {
          paymentError: null,
          paymentStatus: "refunded",
          refundError: null,
          refundId: refund.id,
          refundStatus: refund.status === "succeeded" ? "succeeded" : "pending",
          status: refund.status === "succeeded" ? "refunded" : "refund_pending",
          ...(refund.status === "succeeded" ? { refundedAt: new Date() } : {}),
        },
        where: { id: result.orderId },
      }),
    ]);
    return { kind: "refunded" as const };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Неизвестная ошибка возврата";
    await database.paymentAttempt.update({
      data: { lastError: message, status: "refund_pending" },
      where: { id: attempt.id },
    });
    await database.serviceOrder.update({
      data: {
        paymentError: message,
        refundError: message,
        refundStatus: "failed",
        status: "refund_pending",
      },
      where: { id: result.orderId },
    });
    return { kind: "refund_pending" as const };
  }
};

export const expireServicePaymentHolds = async (
  database: PrismaClient,
  yookassa: YooKassaClient,
) => {
  const now = new Date();
  const expired = await database.serviceOrder.findMany({
    where: {
      paymentDeadlineAt: { lte: now },
      paymentStatus: { not: "succeeded" },
      status: "awaiting_payment",
    },
    include: { paymentAttempts: { where: { externalId: { not: null } } } },
    take: 50,
  });
  for (const order of expired) {
    await database.$transaction(async (transaction) => {
      const claimed = await transaction.serviceOrder.updateMany({
        data: {
          paymentError: "Время оплаты истекло.",
          paymentStatus: "expired",
          status: "expired",
        },
        where: {
          id: order.id,
          status: "awaiting_payment",
          paymentStatus: { not: "succeeded" },
        },
      });
      if (claimed.count)
        await transaction.serviceBooking.updateMany({
          data: { holdExpiresAt: null, status: "cancelled" },
          where: { orderItem: { orderId: order.id }, status: "held" },
        });
    });
    for (const attempt of order.paymentAttempts) {
      if (!attempt.externalId) continue;
      try {
        const payment = await yookassa.getPayment(attempt.externalId);
        if (payment.status === "succeeded" && payment.paid) {
          await reconcileServicePayment(database, yookassa, payment);
        } else if (payment.status !== "canceled") {
          await yookassa.cancelPayment(
            attempt.externalId,
            `service-cancel-${order.id}`,
          );
        }
      } catch {
        // The next status request or webhook will retry reconciliation.
      }
    }
  }
  return expired.length;
};
