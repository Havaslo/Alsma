import { readAdminSession } from "@/lib/admin/admin-session";
import { apiClient } from "@/lib/api/api-client";

export type AdminUser = {
  readonly displayName: string;
  readonly email: string;
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
