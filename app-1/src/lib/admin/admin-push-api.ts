import { apiClient } from "@/lib/api/api-client";

export type AdminBrowserPushSubscription = {
  readonly endpoint: string;
  readonly keys: {
    readonly auth: string;
    readonly p256dh: string;
  };
};

export const loadAdminPushConfiguration = () =>
  apiClient.get<{ enabled: boolean; publicKey: string | null }>(
    "/admin/push/configuration",
  );

export const loadAdminPushSubscription = (endpoint: string) =>
  apiClient.post<{ subscribed: boolean }>("/admin/push/subscription/status", {
    endpoint,
  });

export const saveAdminPushSubscription = (
  subscription: AdminBrowserPushSubscription,
) => apiClient.post("/admin/push/subscription", subscription);

export const removeAdminPushSubscription = (endpoint: string) =>
  apiClient.delete("/admin/push/subscription", { data: { endpoint } });
