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
