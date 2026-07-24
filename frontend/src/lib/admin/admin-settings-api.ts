import { readAdminSession } from "@/lib/admin/admin-session";
import { apiClient } from "@/lib/api/api-client";

export const ADMIN_PERMISSIONS = [
  "content.delete",
  "site.access",
  "site.manage",
  "knowledge.access",
  "knowledge.manage",
  "dashboard.access",
  "requests.access",
  "leads.access",
  "scenarios.access",
  "settings.access",
  "integrations.access",
] as const;
export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];
export type AdminRole = {
  readonly description: string | null;
  readonly id: string;
  readonly name: string;
  readonly permissions: AdminPermission[];
};
export type AdminSettingsUser = {
  readonly displayName: string;
  readonly email: string;
  readonly id: string;
  readonly permissionOverrides: Partial<
    Record<AdminPermission, boolean | null>
  >;
  readonly role: AdminRole | null;
  readonly roleId: string | null;
  readonly status: "active" | "inactive";
};
export type AdminSettingsData = {
  readonly roles: AdminRole[];
  readonly users: AdminSettingsUser[];
};
export type AdminRoleInput = Omit<AdminRole, "id">;
export type AdminUserInput = Pick<
  AdminSettingsUser,
  "displayName" | "email" | "permissionOverrides" | "roleId" | "status"
> & { readonly password?: string };
const headers = () => ({ Authorization: `Bearer ${readAdminSession() ?? ""}` });
export const loadAdminSettings = (signal?: AbortSignal) =>
  apiClient.get<AdminSettingsData>("/admin/settings", {
    headers: headers(),
    signal,
  });
export const createAdminRole = (input: AdminRoleInput) =>
  apiClient.post<{ role: AdminRole }>("/admin/settings/roles", input, {
    headers: headers(),
  });
export const updateAdminRole = ({
  id,
  ...input
}: AdminRoleInput & { id: string }) =>
  apiClient.put<{ role: AdminRole }>(`/admin/settings/roles/${id}`, input, {
    headers: headers(),
  });
export const createAdminUser = (input: AdminUserInput) =>
  apiClient.post<{ user: AdminSettingsUser }>("/admin/settings/users", input, {
    headers: headers(),
  });
export const updateAdminUser = ({
  id,
  ...input
}: AdminUserInput & { id: string }) =>
  apiClient.put<{ user: AdminSettingsUser }>(
    `/admin/settings/users/${id}`,
    input,
    { headers: headers() },
  );
export const deleteAdminUser = (id: string) =>
  apiClient.delete<void>(`/admin/settings/users/${id}`, { headers: headers() });
