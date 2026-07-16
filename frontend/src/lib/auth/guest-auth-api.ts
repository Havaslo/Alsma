import { apiClient } from "@/lib/api/api-client";
import { readGuestSession } from "@/lib/auth/session";

export type GuestProfile = {
  readonly email: string | null;
  readonly fullName: string | null;
  readonly id: string;
  readonly phone: string;
  readonly requiresNameCompletion: boolean;
};

export type AuthState = {
  readonly authenticated: boolean;
  readonly guest: GuestProfile | null;
};

const authHeaders = () => {
  const token = readGuestSession();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const requestLoginCode = (input: {
  channel: "email" | "phone";
  contact: string;
}) =>
  apiClient.post<{
    channel: string;
    debugCode: string;
    maskedContact: string;
    pendingCodeId: string;
  }>("/auth/request-code", input);

export const verifyLoginCode = (input: {
  code: string;
  pendingCodeId: string;
}) => apiClient.post<AuthState & { token: string }>("/auth/verify-code", input);

export const loadGuestProfile = (signal?: AbortSignal) =>
  apiClient.get<AuthState>("/auth/me", { headers: authHeaders(), signal });

export const completeGuestProfile = (input: { fullName: string }) =>
  apiClient.post<AuthState>("/auth/complete-profile", input, {
    headers: authHeaders(),
  });
