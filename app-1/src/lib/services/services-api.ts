import { apiClient } from "@/lib/api/api-client";
import { readGuestSession } from "@/lib/auth/session";

export type ServiceVariant = {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly price: string | number;
  readonly currency: string;
  readonly capacity: number;
  readonly durationMin: number | null;
};
export type Service = {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly description: string | null;
  readonly imageUrl: string | null;
  readonly variants: ServiceVariant[];
  readonly placements: Array<{
    readonly pageSlug: string;
    readonly position: number;
  }>;
};
export type ServiceSection = {
  readonly id: string;
  readonly name: string;
  readonly heading: string;
  readonly subheading: string | null;
  readonly blockNumber: number;
  readonly services: Service[];
};
export type ServiceCartItem = {
  readonly variantId: string;
  readonly quantity: number;
  readonly startsAt?: string;
  readonly serviceName?: string;
  readonly variantName?: string;
};

export type ServiceOrderStatus = {
  readonly orderId: string;
  readonly paymentStatus: string;
  readonly status: string;
  readonly total: string;
  readonly currency: string;
  readonly paymentError: string | null;
  readonly paymentDeadlineAt: string | null;
  readonly paymentUrl: string | null;
  readonly bookings: Array<{
    readonly id: string;
    readonly startsAt: string;
    readonly endsAt: string;
    readonly status: string;
  }>;
};

export const loadServices = (signal?: AbortSignal, page?: string) =>
  apiClient.get<{ services: Service[] }>("/services", {
    signal,
    params: page ? { page } : undefined,
  });
export const loadServiceSections = (page: string, signal?: AbortSignal) =>
  apiClient.get<{ sections: ServiceSection[] }>("/services/sections", {
    signal,
    params: { page },
  });
export const loadServiceAvailability = (
  serviceId: string,
  variantId: string,
  date: string,
  signal?: AbortSignal,
) =>
  apiClient.get<{
    blocks: Array<{ startsAt: string; endsAt: string }>;
    occupiedBlocks: Array<{ startsAt: string; endsAt: string }>;
  }>(`/services/${serviceId}/availability`, {
    signal,
    params: {
      variantId,
      date,
    },
  });
export const createServiceOrder = (input: {
  checkoutRequestId: string;
  name: string;
  email: string;
  phone: string;
  returnUrl: string;
  items: ServiceCartItem[];
}) =>
  apiClient.post<{
    orderId: string;
    paymentId: string | null;
    paymentStatus: string;
    paymentUrl: string | null;
    reconciliation: string | null;
    status: string;
    total: string;
    currency: string;
  }>("/services/orders", input);

export const loadServiceOrderStatus = (orderId: string, signal?: AbortSignal) =>
  apiClient.get<ServiceOrderStatus>(`/services/orders/${orderId}/status`, {
    signal,
  });

export const resumeServiceOrderPayment = (input: {
  orderId: string;
  returnUrl: string;
}) =>
  apiClient.post<{
    orderId: string;
    paymentUrl: string | null;
    status: string;
  }>(
    `/services/orders/${input.orderId}/resume-payment`,
    {
      returnUrl: input.returnUrl,
    },
    {
      headers: readGuestSession()
        ? { Authorization: `Bearer ${readGuestSession()}` }
        : {},
    },
  );
