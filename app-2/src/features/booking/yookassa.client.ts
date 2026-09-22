import { HttpError } from "../../lib/http/http-error.js";

const YOOKASSA_BASE_URL = "https://api.yookassa.ru/v3";
const REQUEST_TIMEOUT_MS = 15_000;

type YooKassaOptions = {
  readonly shopId?: string;
  readonly secretKey?: string;
};

export type YooPayment = {
  readonly id: string;
  readonly status: string;
  readonly paid: boolean;
  readonly amount: { readonly value: string; readonly currency: string };
  readonly confirmation?: { readonly confirmation_url?: string };
  readonly metadata?: Record<string, string>;
};

export type YooRefund = {
  readonly id: string;
  readonly status: string;
  readonly paymentId: string;
  readonly amount: { readonly value: string; readonly currency: string };
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const readPayment = (value: unknown): YooPayment => {
  const record = asRecord(value);
  const amount = asRecord(record?.amount);
  const confirmation = asRecord(record?.confirmation);
  if (
    !record ||
    typeof record.id !== "string" ||
    typeof record.status !== "string" ||
    typeof record.paid !== "boolean" ||
    typeof amount?.value !== "string" ||
    typeof amount.currency !== "string"
  ) {
    throw new HttpError(
      502,
      "YOOKASSA_INVALID_RESPONSE",
      "Платёжный сервис вернул некорректный ответ.",
    );
  }
  return {
    id: record.id,
    status: record.status,
    paid: record.paid,
    amount: { value: amount.value, currency: amount.currency },
    confirmation:
      typeof confirmation?.["confirmation_url"] === "string"
        ? { confirmation_url: confirmation["confirmation_url"] }
        : undefined,
    metadata: asRecord(record.metadata) as Record<string, string> | undefined,
  };
};

const readRefund = (value: unknown): YooRefund => {
  const record = asRecord(value);
  const amount = asRecord(record?.amount);
  if (
    !record ||
    typeof record.id !== "string" ||
    typeof record.status !== "string" ||
    typeof record.payment_id !== "string" ||
    typeof amount?.value !== "string" ||
    typeof amount.currency !== "string"
  ) {
    throw new HttpError(
      502,
      "YOOKASSA_INVALID_REFUND_RESPONSE",
      "Платёжный сервис вернул некорректный ответ по возврату.",
    );
  }
  return {
    amount: { currency: amount.currency, value: amount.value },
    id: record.id,
    paymentId: record.payment_id,
    status: record.status,
  };
};

const paymentErrorDetails = (value: unknown) => {
  const record = asRecord(value);
  if (!record) return undefined;
  const details = ["type", "code", "description", "parameter"].reduce<
    Record<string, string>
  >((result, key) => {
    if (typeof record[key] === "string") result[key] = record[key] as string;
    return result;
  }, {});
  return Object.keys(details).length > 0 ? details : undefined;
};

export const createYooKassaClient = ({
  shopId,
  secretKey,
}: YooKassaOptions) => {
  const requireConfiguration = () => {
    if (!shopId?.trim() || !secretKey?.trim()) {
      throw new HttpError(
        503,
        "YOOKASSA_NOT_CONFIGURED",
        "Оплата временно недоступна.",
      );
    }
    return { shopId: shopId.trim(), secretKey: secretKey.trim() };
  };

  const request = async <T>(
    path: string,
    init: RequestInit = {},
  ): Promise<T> => {
    const config = requireConfiguration();
    let response: Response;
    try {
      response = await fetch(`${YOOKASSA_BASE_URL}${path}`, {
        ...init,
        headers: {
          Authorization: `Basic ${Buffer.from(`${config.shopId}:${config.secretKey}`).toString("base64")}`,
          "Content-Type": "application/json",
          ...init.headers,
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch {
      throw new HttpError(
        502,
        "YOOKASSA_UNAVAILABLE",
        "Не удалось связаться с платёжным сервисом.",
      );
    }
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      throw new HttpError(
        response.status >= 500 ? 502 : 400,
        "YOOKASSA_REQUEST_FAILED",
        "Платёжный сервис не смог обработать запрос.",
        { status: response.status, ...paymentErrorDetails(payload) },
      );
    }
    return payload as T;
  };

  return {
    createPayment: async (input: {
      amount: string;
      currency: string;
      description: string;
      bookingId?: string;
      idempotenceKey?: string;
      metadata?: Record<string, string>;
      capture?: boolean;
      receiptItems?: Array<{
        description: string;
        amount: string;
        quantity: string;
        paymentSubject?: string;
      }>;
      returnUrl: string;
      customer: { email: string; phone: string };
    }) =>
      readPayment(
        await request<unknown>("/payments", {
          method: "POST",
          headers: {
            "Idempotence-Key":
              input.idempotenceKey ?? `booking-${input.bookingId}`,
          },
          body: JSON.stringify({
            amount: { value: input.amount, currency: input.currency },
            confirmation: { type: "redirect", return_url: input.returnUrl },
            capture: input.capture ?? true,
            description: input.description,
            metadata:
              input.metadata ??
              (input.bookingId ? { bookingId: input.bookingId } : undefined),
            receipt: {
              customer: input.customer,
              items: (
                input.receiptItems ?? [
                  {
                    amount: input.amount,
                    description: input.description,
                    quantity: "1.00",
                  },
                ]
              ).map((item) => ({
                amount: { value: item.amount, currency: input.currency },
                description: item.description,
                payment_mode: "full",
                payment_subject: item.paymentSubject ?? "service",
                quantity: item.quantity,
                vat_code: 1,
              })),
            },
          }),
        }),
      ),
    getPayment: async (paymentId: string) =>
      readPayment(
        await request<unknown>(`/payments/${encodeURIComponent(paymentId)}`),
      ),
    getRefund: async (refundId: string) =>
      readRefund(
        await request<unknown>(`/refunds/${encodeURIComponent(refundId)}`),
      ),
    cancelPayment: async (paymentId: string, idempotenceKey: string) => {
      await request<unknown>(
        `/payments/${encodeURIComponent(paymentId)}/cancel`,
        {
          method: "POST",
          headers: { "Idempotence-Key": idempotenceKey },
          body: JSON.stringify({}),
        },
      );
    },
    refundPayment: async (input: {
      paymentId: string;
      amount: string;
      currency: string;
      idempotenceKey: string;
      description?: string;
    }) =>
      readRefund(
        await request<unknown>("/refunds", {
          method: "POST",
          headers: { "Idempotence-Key": input.idempotenceKey },
          body: JSON.stringify({
            payment_id: input.paymentId,
            amount: { value: input.amount, currency: input.currency },
            description: input.description,
          }),
        }),
      ),
  };
};

export type YooKassaClient = ReturnType<typeof createYooKassaClient>;
