import { readAdminSession } from "@/lib/admin/admin-session";
import { apiClient } from "@/lib/api/api-client";

const headers = () => ({ Authorization: `Bearer ${readAdminSession() ?? ""}` });
export const checkVkTestAccess = async () => {
  const response = await apiClient.get<{
    ready: boolean;
    reason?: string;
    code?: number;
  }>("/vk-factory-test/status", { headers: headers(), timeout: 30000 });
  return response.data;
};
export const sendVkTest = async (postId: string) => {
  const response = await apiClient.post<{ url: string; postId: string }>(
    "/vk-factory-test/publish",
    { postId },
    { headers: headers(), timeout: 120000 },
  );
  return response.data;
};

export const createVkPhotoPair = async () => {
  const response = await apiClient.post<{
    code: string;
    expiresInMinutes: number;
  }>("/vk-factory-test/pair", {}, { headers: headers() });
  return response.data;
};
export const disconnectVkPhotoTest = async () => {
  await apiClient.post(
    "/vk-factory-test/disconnect",
    {},
    { headers: headers() },
  );
};
