import { apiClient } from "@/lib/api/api-client";

export type BookingOffer = {
  readonly boardType: string;
  readonly rateDescription: string | null;
  readonly benefits: readonly string[];
  readonly cancellationPenalty: {
    readonly description?: string;
    readonly isRefundable?: boolean;
    readonly "is-refundable"?: boolean;
    readonly periodInDays?: number | null;
    readonly "period-in-days"?: number | null;
  } | null;
  readonly currency: string;
  readonly discountedPrice: number;
  readonly id: string;
  readonly price: number;
  readonly rateType: string;
  readonly roomId: number | null;
  readonly roomToSell: number;
  readonly roomType: string;
  readonly roomImageUrl: string | null;
  readonly roomImageUrls: readonly string[];
  readonly roomArea: number | null;
  readonly roomCount: number | null;
  readonly roomCapacity: number | null;
  readonly roomDescription: string | null;
  readonly bedOptions: string | null;
};

export type BookingCalendarPrice = {
  readonly date: string;
  readonly discount: boolean;
  readonly price: number;
};

export type BookingSearch = {
  readonly adults: number;
  readonly checkIn: string;
  readonly checkOut: string;
  readonly childAges: number[];
  readonly children: number;
  readonly currency: string;
  readonly language: string;
  readonly nationality: string;
  readonly roomCount: number;
};

type AdultBookingGuest = {
  readonly birthDate?: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly type: "adult";
};

type ChildBookingGuest = {
  readonly birthDate: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly type: "baby" | "child";
};

export type BookingGuest = AdultBookingGuest | ChildBookingGuest;

export type CreateBookingInput = Omit<
  BookingSearch,
  "childAges" | "children" | "language"
> & {
  readonly contact: {
    readonly email: string;
    readonly firstName: string;
    readonly lastName: string;
    readonly phone: string;
  };
  readonly guests: BookingGuest[];
  readonly notes?: string;
  readonly offerId: string;
  readonly paymentMethod: "full" | "first_night";
  readonly returnUrl: string;
  readonly rooms?: Array<{
    readonly adults: number;
    readonly guests: BookingGuest[];
    readonly offerId: string;
  }>;
};

export type BookingPaymentLink = {
  readonly amount: { readonly currency: string; readonly value: string };
  readonly bookingId: string;
  readonly confirmationUrl: string | null;
  readonly id: string;
  readonly roomName: string;
  readonly status: string;
  readonly voucherNumber: string | null;
};

export type BookingPaymentStatus = {
  readonly booking: {
    readonly epteraPaymentSyncStatus: string;
    readonly id: string;
    readonly paymentStatus: string;
    readonly status: string;
    readonly voucherNumber: string | null;
  };
  readonly payment: {
    readonly amount: { readonly currency: string; readonly value: string };
    readonly id: string;
    readonly paid: boolean;
    readonly status: string;
  } | null;
};

export const loadBookingOffers = (input: BookingSearch, signal: AbortSignal) =>
  apiClient.get<{ offers: BookingOffer[]; search: BookingSearch }>(
    "/booking/offers",
    { params: { ...input, childAges: input.childAges.join(",") }, signal },
  );

export const loadBookingCalendarPrices = (
  input: Pick<
    BookingSearch,
    | "adults"
    | "childAges"
    | "children"
    | "currency"
    | "language"
    | "nationality"
    | "roomCount"
  > & { month: string },
  signal: AbortSignal,
) =>
  apiClient.get<{ items: BookingCalendarPrice[] }>("/booking/calendar-prices", {
    params: { ...input, childAges: input.childAges.join(",") },
    signal,
  });

export const createBookingReservation = (input: CreateBookingInput) =>
  apiClient.post<{
    booking: { id: string; voucherNumber: string | null };
    bookings?: Array<{ id: string; voucherNumber: string | null }>;
    group?: { id: string; roomsCount: number; totalAmount: string | null };
    payments?: BookingPaymentLink[];
    payment: { confirmationUrl: string | null; status: string };
  }>("/booking/reservations", input);

export const loadBookingPaymentStatus = (
  bookingId: string,
  signal: AbortSignal,
) =>
  apiClient.get<BookingPaymentStatus>("/booking/payments/status", {
    params: { bookingId },
    signal,
  });
