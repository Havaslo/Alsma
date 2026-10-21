import { readAdminSession } from "@/lib/admin/admin-session";
import { apiClient } from "@/lib/api/api-client";

export type InstagramConnectionStatus = {
  readonly configured: boolean;
  readonly connected: boolean;
  readonly needsReconnect: boolean;
  readonly username: string | null;
  readonly targetUsername: string | null;
  readonly connectedAt: string | null;
  readonly publishingEnabled: boolean;
};

const headers = () => ({
  Authorization: `Bearer ${readAdminSession() ?? ""}`,
});

export const loadInstagramConnectionStatus = async (
  signal?: AbortSignal,
): Promise<InstagramConnectionStatus> => {
  const response = await apiClient.get<InstagramConnectionStatus>(
    "/instagram-publishing/status",
    { headers: headers(), signal },
  );
  return response.data;
};

export const startInstagramConnection = async (): Promise<string> => {
  const response = await apiClient.post<{ authorizationUrl: string }>(
    "/instagram-publishing/connect/start",
    {},
    { headers: headers() },
  );
  return response.data.authorizationUrl;
};
