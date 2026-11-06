import { readAdminSession } from "@/lib/admin/admin-session";
import { apiClient } from "@/lib/api/api-client";

const headers = () => ({ Authorization: `Bearer ${readAdminSession() ?? ""}` });
export const loadVkPhotoConnection = async (signal?: AbortSignal) => {
  const response = await apiClient.get<{
    configured: boolean;
    photoReady: boolean;
    reason: string | null;
    expiresAt: string | null;
  }>("/vk-photo-connection/status", { headers: headers(), signal });
  return response.data;
};
export const startVkPhotoConnection = async () => {
  const response = await apiClient.post<{ authorizationUrl: string }>(
    "/vk-photo-connection/connect/start",
    {},
    { headers: headers() },
  );
  return response.data.authorizationUrl;
};

export const startVkPhotoManualConnection = async (offline = false) => {
  const response = await apiClient.post<{ authorizationUrl: string }>(
    "/vk-photo-connection/connect/manual/start",
    { offline },
    { headers: headers() },
  );
  return response.data.authorizationUrl;
};
export const completeVkPhotoManualConnection = async (callbackUrl: string) => {
  const response = await apiClient.post<{ result: string }>(
    "/vk-photo-connection/connect/manual/complete",
    { callbackUrl },
    { headers: headers() },
  );
  return response.data.result;
};
