import { apiClient } from "@/lib/api/api-client";
import { readAdminSession } from "@/lib/admin/admin-session";

export type ServiceBooking = {
  readonly id: string;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly status: string;
  readonly service: { readonly name: string };
  readonly variant: { readonly name: string };
  readonly orderItem: {
    readonly order: { readonly name: string; readonly phone: string };
  };
};
export const loadServiceCalendar = (from: string, to: string) =>
  apiClient.get<{ bookings: ServiceBooking[] }>("/services/admin/calendar", {
    params: { from, to },
  });
const headers = () => ({ Authorization: `Bearer ${readAdminSession() ?? ""}` });
export const loadServiceCatalog = () => apiClient.get<{ services: Array<{ id: string; name: string; slug: string; status: string; variants: Array<{ id: string; name: string; price: string; capacity: number; durationMin: number | null }> }> }>("/services/admin/catalog", { headers: headers() });
export const createService = (input: { slug: string; name: string; description?: string }) => apiClient.post("/services/admin/catalog", input, { headers: headers() });
export const createVariant = (serviceId: string, input: { name: string; price: number; capacity: number; durationMin: number }) => apiClient.post(`/services/admin/catalog/${serviceId}/variants`, input, { headers: headers() });
export const createPlacement = (serviceId: string, input: { pageSlug: string; position: number }) => apiClient.post(`/services/admin/catalog/${serviceId}/placements`, input, { headers: headers() });
export const createRule = (serviceId: string, input: { weekday: number; startTime: string; endTime: string }) => apiClient.post(`/services/admin/catalog/${serviceId}/rules`, input, { headers: headers() });
