import { readAdminSession } from "@/lib/admin/admin-session";
import { apiClient } from "@/lib/api/api-client";

export type ServiceBooking = {
  readonly id: string;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly status: string;
  readonly service: { readonly id: string; readonly name: string };
  readonly variant: { readonly name: string };
  readonly orderItem: {
    readonly order: { readonly name: string; readonly phone: string };
  };
};
export const loadServiceCalendar = (from: string, to: string) =>
  apiClient.get<{ bookings: ServiceBooking[] }>("/services/admin/calendar", {
    params: { from, to },
  });
export const createManualServiceBooking = (input: {
  name: string;
  phone: string;
  email?: string;
  variantId: string;
  startsAt: string;
}) =>
  apiClient.post<{ orderId: string }>(
    "/services/admin/manual-bookings",
    input,
    {
      headers: headers(),
    },
  );
const headers = () => ({ Authorization: `Bearer ${readAdminSession() ?? ""}` });
export const loadServiceCatalog = () =>
  apiClient.get<{
    services: Array<{
      id: string;
      name: string;
      slug: string;
      status: string;
      placements: Array<{ pageSlug: string }>;
      variants: Array<{
        id: string;
        name: string;
        price: string;
        capacity: number;
        durationMin: number | null;
        resources: Array<{
          resourceId: string;
          quantity: number;
        }>;
      }>;
    }>;
  }>("/services/admin/catalog", { headers: headers() });
export type ServiceSection = {
  readonly id: string;
  readonly name: string;
  readonly pageSlug: string;
  readonly heading: string;
  readonly subheading: string | null;
  readonly blockNumber: number;
  readonly services: Array<{
    readonly id: string;
    readonly name: string;
    readonly slug: string;
    readonly description: string | null;
    readonly imageUrl: string | null;
    readonly status: "draft" | "published" | "archived";
    readonly variants: Array<{
      readonly id: string;
      readonly name: string;
      readonly price: string;
      readonly capacity: number;
      readonly durationMin: number | null;
      readonly resources: Array<{
        readonly resourceId: string;
        readonly quantity: number;
      }>;
    }>;
    readonly placements: Array<{ readonly pageSlug: string }>;
  }>;
};
export const loadServiceSections = () =>
  apiClient.get<{ sections: ServiceSection[] }>("/services/admin/sections", {
    headers: headers(),
  });
export const createServiceSection = (input: {
  name: string;
  pageSlug: string;
  heading: string;
  subheading?: string;
  blockNumber: number;
}) =>
  apiClient.post<{ section: ServiceSection }>(
    "/services/admin/sections",
    input,
    { headers: headers() },
  );
export const updateServiceSection = (
  sectionId: string,
  input: {
    name: string;
    pageSlug: string;
    heading: string;
    subheading: string | null;
    blockNumber: number;
  },
) =>
  apiClient.put<{ section: ServiceSection }>(
    `/services/admin/sections/${sectionId}`,
    input,
    { headers: headers() },
  );
export const reorderServices = (sectionId: string, serviceIds: string[]) =>
  apiClient.put(
    `/services/admin/sections/${sectionId}/reorder`,
    { serviceIds },
    { headers: headers() },
  );
export const createService = (input: {
  slug: string;
  name: string;
  description?: string;
  sectionId?: string;
  imageUrl?: string | null;
}) => apiClient.post("/services/admin/catalog", input, { headers: headers() });
export const updateService = (
  serviceId: string,
  input: {
    slug: string;
    name: string;
    description: string;
    status: "draft" | "published" | "archived";
    sectionId?: string;
    imageUrl?: string | null;
  },
) =>
  apiClient.put(`/services/admin/catalog/${serviceId}`, input, {
    headers: headers(),
  });
export const deleteService = (serviceId: string) =>
  apiClient.delete(`/services/admin/catalog/${serviceId}`, {
    headers: headers(),
  });
export const createVariant = (
  serviceId: string,
  input: {
    name: string;
    price: number;
    capacity: number;
    durationMin: number | null;
    resources?: Array<{ resourceId: string; quantity: number }>;
  },
) =>
  apiClient.post(`/services/admin/catalog/${serviceId}/variants`, input, {
    headers: headers(),
  });
export const updateVariant = (
  serviceId: string,
  variantId: string,
  input: {
    name: string;
    price: number;
    capacity: number;
    durationMin: number | null;
    active: boolean;
    resources?: Array<{ resourceId: string; quantity: number }>;
  },
) =>
  apiClient.put(
    `/services/admin/catalog/${serviceId}/variants/${variantId}`,
    input,
    { headers: headers() },
  );
export type ServiceResource = { id: string; name: string; totalUnits: number };
export const loadServiceResources = () =>
  apiClient.get<{ resources: ServiceResource[] }>("/services/admin/resources", {
    headers: headers(),
  });
export const createServiceResource = (input: {
  name: string;
  totalUnits: number;
}) =>
  apiClient.post<{ resource: ServiceResource }>(
    "/services/admin/resources",
    input,
    { headers: headers() },
  );
export const deleteServiceResource = (id: string) =>
  apiClient.delete(`/services/admin/resources/${id}`, { headers: headers() });
export const deleteVariant = (serviceId: string, variantId: string) =>
  apiClient.delete(
    `/services/admin/catalog/${serviceId}/variants/${variantId}`,
    { headers: headers() },
  );
export const createPlacement = (
  serviceId: string,
  input: { pageSlug: string; position: number },
) =>
  apiClient.post(`/services/admin/catalog/${serviceId}/placements`, input, {
    headers: headers(),
  });
export const createRule = (
  serviceId: string,
  input: { weekday: number; startTime: string; endTime: string },
) =>
  apiClient.post(`/services/admin/catalog/${serviceId}/rules`, input, {
    headers: headers(),
  });
