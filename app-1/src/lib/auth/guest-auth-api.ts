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
    readonly contactComment: string | null;
    readonly contactEmail: string | null;
    readonly contactFirstName: string | null;
    readonly contactLastName: string | null;
    readonly contactPhone: string | null;
    readonly epteraReservationId: string | null;
    readonly guestsCount: number;
    readonly guestList: Array<{
      readonly birthDate?: string;
      readonly firstName: string;
      readonly lastName: string;
      readonly type: "adult" | "baby" | "child";
    }> | null;
    readonly id: string;
    readonly paymentStatus: string;
    readonly paymentMethod: "full" | "first_night";
    readonly paymentAmount: string | null;
    readonly roomName: string;
    readonly selectedOffer: {
      readonly boardType?: string;
      readonly rateDescription?: string | null;
      readonly rateType?: string;
    } | null;
    readonly status: string;
    readonly totalAmount: string | null;
    readonly voucherNumber: string | null;
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
