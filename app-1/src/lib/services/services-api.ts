import { apiClient } from "@/lib/api/api-client";

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
  readonly variants: ServiceVariant[];
  readonly placements: Array<{
    readonly pageSlug: string;
    readonly position: number;
  }>;
};
export type ServiceCartItem = {
  readonly variantId: string;
  readonly quantity: number;
  readonly startsAt?: string;
  readonly serviceName?: string;
  readonly variantName?: string;
};

export const loadServices = (signal?: AbortSignal, page?: string) =>
  apiClient.get<{ services: Service[] }>("/services", {
    signal,
    params: page ? { page } : undefined,
  });
export const loadServiceAvailability = (
  serviceId: string,
  variantId: string,
  date: string,
  signal?: AbortSignal,
) =>
  apiClient.get<{ blocks: Array<{ startsAt: string; endsAt: string }> }>(
    `/services/${serviceId}/availability`,
    {
      signal,
      params: {
        variantId,
        from: `${date}T00:00:00.000Z`,
        to: `${date}T23:59:59.000Z`,
      },
    },
  );
export const createServiceOrder = (input: {
  name: string;
  email: string;
  phone: string;
  items: ServiceCartItem[];
}) =>
  apiClient.post<{
    orderId: string;
    status: string;
    total: string;
    currency: string;
  }>("/services/orders", input);
