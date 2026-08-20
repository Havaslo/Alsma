import { apiClient } from "@/lib/api/api-client";
import { readGuestSession } from "@/lib/auth/session";

export type GuestProfile = {
  readonly bonusProgram: {
    readonly balance: number;
    readonly level: string;
  } | null;
  readonly bookings: Array<{
    readonly checkInDate: string;
    readonly checkOutDate: string;
    readonly guestsCount: number;
    readonly id: string;
    readonly roomName: string;
    readonly status: string;
    readonly totalAmount: string | null;
  }>;
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

export const loginGuest = (input: { email: string }) =>
  apiClient.post<AuthState & { token: string }>("/auth/login", input);

export const loadGuestProfile = (signal?: AbortSignal) =>
  apiClient.get<AuthState>("/auth/me", { headers: authHeaders(), signal });

export const completeGuestProfile = (input: { fullName: string }) =>
  apiClient.post<AuthState>("/auth/complete-profile", input, {
    headers: authHeaders(),
  });
export const logoutGuest = () =>
  apiClient.post<{ ok: boolean }>(
    "/auth/logout",
    {},
    { headers: authHeaders() },
  );
