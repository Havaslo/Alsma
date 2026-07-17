import { readAdminSession } from "@/lib/admin/admin-session";
import { apiClient } from "@/lib/api/api-client";

export type AdminUser = {
  readonly displayName: string;
  readonly email: string;
  readonly id: string;
  readonly permissions: string[];
  readonly role: string;
};
export type SiteLead = {
  readonly createdAt: string;
  readonly details: {
    checkInDate?: string;
    checkOutDate?: string;
    guestsCount?: number;
  };
  readonly email: string | null;
  readonly formTitle: string;
  readonly id: string;
  readonly name: string | null;
  readonly phone: string | null;
  readonly status: "cancelled" | "completed" | "new" | "processing";
};
export type BookingRequest = {
  readonly checkInDate: string | null;
  readonly checkOutDate: string | null;
  readonly guestName: string;
  readonly guestsCount: number;
  readonly email: string | null;
  readonly id: string;
  readonly paidAt: string | null;
  readonly roomName: string | null;
  readonly phone: string;
};
export type AdminClient = {
  readonly _count: { bookings: number };
  readonly bonusProgram: { balance: number; level: string } | null;
  readonly fullName: string | null;
  readonly email: string | null;
  readonly id: string;
  readonly phone: string;
};
export type AdminRequest = {
  readonly category: string;
  readonly contact: string | null;
  readonly id: string;
  readonly requester: string | null;
  readonly status: SiteLead["status"];
  readonly title: string;
};
export type ManagerTask = {
  readonly completedAt: string | null;
  readonly description: string | null;
  readonly dueAt: string | null;
  readonly id: string;
  readonly priority: string;
  readonly status: string;
  readonly title: string;
};
type Page<TItem> = {
  readonly items: TItem[];
  readonly pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
};
const headers = () => ({ Authorization: `Bearer ${readAdminSession() ?? ""}` });

export const adminLogin = (input: { email: string; password: string }) =>
  apiClient.post<{ token: string; user: AdminUser }>(
    "/admin/auth/login",
    input,
  );
export const loadAdmin = (signal?: AbortSignal) =>
  apiClient.get<{ user: AdminUser }>("/admin/auth/me", {
    headers: headers(),
    signal,
  });
export const loadAdminLeads = (signal?: AbortSignal) =>
  apiClient.get<{
    items: SiteLead[];
    pagination: {
      page: number;
      pageSize: number;
      totalItems: number;
      totalPages: number;
    };
  }>("/admin/site-leads", {
    headers: headers(),
    params: { page: 1, pageSize: 100 },
    signal,
  });
export const updateAdminLead = (input: {
  leadId: string;
  status: SiteLead["status"];
}) =>
  apiClient.patch<{ lead: SiteLead }>(
    `/admin/site-leads/${input.leadId}`,
    { status: input.status },
    { headers: headers() },
  );
export const loadAdminBookings = (signal?: AbortSignal) =>
  apiClient.get<Page<BookingRequest>>("/admin/bookings", {
    headers: headers(),
    params: { page: 1, pageSize: 100 },
    signal,
  });
export const loadAdminClients = (signal?: AbortSignal) =>
  apiClient.get<Page<AdminClient>>("/admin/clients", {
    headers: headers(),
    params: { page: 1, pageSize: 100 },
    signal,
  });
export const loadAdminRequests = (signal?: AbortSignal) =>
  apiClient.get<Page<AdminRequest>>("/admin/requests", {
    headers: headers(),
    params: { page: 1, pageSize: 100 },
    signal,
  });
export const loadManagerTasks = (signal?: AbortSignal) =>
  apiClient.get<Page<ManagerTask>>("/admin/manager-tasks", {
    headers: headers(),
    params: { page: 1, pageSize: 100 },
    signal,
  });
export const completeManagerTask = (recordId: string) =>
  apiClient.post(
    `/admin/manager-tasks/${recordId}/complete`,
    {},
    { headers: headers() },
  );
export const markBookingPaid = (recordId: string) =>
  apiClient.post(
    `/admin/bookings/${recordId}/mark-paid`,
    {},
    { headers: headers() },
  );
export const createAdminBooking = (input: {
  checkInDate: string;
  checkOutDate: string;
  email: string | null;
  guestName: string;
  guestsCount: number;
  phone: string;
  roomName: string;
}) => apiClient.post("/admin/bookings", input, { headers: headers() });
export const updateAdminClient = (input: {
  email: string | null;
  fullName: string;
  phone: string | null;
  recordId: string;
}) =>
  apiClient.put(`/admin/clients/${input.recordId}`, input, {
    headers: headers(),
  });
export const deleteAdminClient = (recordId: string) =>
  apiClient.delete(`/admin/clients/${recordId}`, { headers: headers() });
export const updateClientBonus = (input: {
  balance: number;
  level: string;
  recordId: string;
}) =>
  apiClient.put(
    `/admin/clients/${input.recordId}/bonus`,
    { balance: input.balance, level: input.level },
    { headers: headers() },
  );
export const updateAdminRequest = (input: {
  recordId: string;
  status: SiteLead["status"];
}) =>
  apiClient.patch(
    `/admin/requests/${input.recordId}`,
    { status: input.status },
    { headers: headers() },
  );
