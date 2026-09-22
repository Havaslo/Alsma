import type { PrismaClient } from "../../generated/prisma/client.js";
import type { YooKassaClient, YooPayment } from "../booking/yookassa.client.js";
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
    await yookassa.refundPayment({
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
        data: { paymentError: null, status: "refunded" },
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
      data: { paymentError: message, status: "refund_pending" },
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
