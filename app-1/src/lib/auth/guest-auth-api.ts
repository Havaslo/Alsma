import { apiClient } from "@/lib/api/api-client";
import { readGuestSession } from "@/lib/auth/session";

export type GuestProfile = {
  readonly serviceOrders: Array<{
    readonly cancellationReason: string | null;
    readonly cancellationRequestedAt: string | null;
    readonly cancellationStatus: string;
    readonly cancelledAt: string | null;
    readonly id: string;
    readonly paymentError: string | null;
    readonly paymentDeadlineAt: string | null;
    readonly paymentStatus: string;
    readonly paymentUrl: string | null;
    readonly refundError: string | null;
    readonly refundStatus: string;
    readonly refundedAt: string | null;
    readonly status: string;
    readonly total: string;
    readonly currency: string;
    readonly createdAt: string;
    readonly items: Array<{
      readonly quantity: number;
      readonly serviceName: string;
      readonly variantName: string;
      readonly booking: {
        readonly startsAt: string;
        readonly status: string;
      } | null;
    }>;
  }>;
  readonly bonusProgram: {
    readonly balance: number;
    readonly level: string;
  } | null;
  readonly bookings: Array<{
    readonly checkInDate: string;
    readonly checkOutDate: string;
    readonly createdAt: string;
    readonly contactComment: string | null;
    readonly contactEmail: string | null;
    readonly contactFirstName: string | null;
    readonly contactLastName: string | null;
    readonly contactPhone: string | null;
    readonly cancellationRequestedAt: string | null;
    readonly cancellationStatus: string;
    readonly epteraReservationId: string | null;
    readonly epteraLastSyncedAt: string | null;
    readonly epteraRoomNumber: string | null;
    readonly epteraStatus: string | null;
    readonly epteraSyncStatus: string;
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
    readonly refundStatus: string;
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

export type VerifyGuestAuthState = AuthState & {
  readonly token: string;
};

const authHeaders = () => {
  const token = readGuestSession();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const requestGuestCode = (input: { email: string }) =>
  apiClient.post<{ sent: boolean }>("/auth/request-code", input);
export const verifyGuestCode = (input: { email: string; code: string }) =>
  apiClient.post<VerifyGuestAuthState>("/auth/verify-code", input);

export const loadGuestProfile = (signal?: AbortSignal) =>
  apiClient.get<AuthState>("/auth/me", { headers: authHeaders(), signal });

export const completeGuestProfile = (input: { fullName: string }) =>
  apiClient.post<AuthState>("/auth/complete-profile", input, {
    headers: authHeaders(),
  });
export const requestBookingCancellation = (input: {
  bookingId: string;
  reason?: string;
}) =>
  apiClient.post<{
    booking: {
      readonly cancellationRequestedAt: string | null;
      readonly cancellationStatus: string;
      readonly id: string;
      readonly refundStatus: string;
      readonly status: string;
    };
  }>("/booking/cancellation-requests", input, {
    headers: authHeaders(),
  });
export const requestServiceOrderCancellation = (input: {
  orderId: string;
  reason?: string;
}) =>
  apiClient.post<{
    order: {
      readonly cancellationStatus: string;
      readonly id: string;
      readonly paymentError: string | null;
      readonly paymentStatus: string;
      readonly refundError: string | null;
      readonly refundStatus: string;
      readonly status: string;
    };
  }>(
    `/services/orders/${input.orderId}/cancel`,
    { reason: input.reason },
    {
      headers: authHeaders(),
    },
  );
export const logoutGuest = () =>
  apiClient.post<{ ok: boolean }>(
    "/auth/logout",
    {},
    { headers: authHeaders() },
  );
