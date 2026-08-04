import { apiClient } from "@/lib/api/api-client";

export type BookingOffer = {
  readonly boardType: string;
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
  readonly roomToSell: number;
  readonly roomType: string;
};

export type BookingSearch = {
  readonly adults: number;
  readonly checkIn: string;
  readonly checkOut: string;
  readonly childAges: number[];
  readonly currency: string;
  readonly language: string;
  readonly nationality: string;
  readonly roomCount: number;
};

export type BookingGuest = {
  readonly birthDate?: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly type: "adult" | "baby" | "child";
};

export type CreateBookingInput = Omit<BookingSearch, "language"> & {
  readonly contact: {
    readonly email: string;
    readonly firstName: string;
    readonly lastName: string;
    readonly phone: string;
  };
  readonly guests: BookingGuest[];
  readonly notes?: string;
  readonly offerId: string;
};

export const loadBookingOffers = (input: BookingSearch, signal: AbortSignal) =>
  apiClient.get<{ offers: BookingOffer[]; search: BookingSearch }>(
    "/booking/offers",
    { params: { ...input, childAges: input.childAges.join(",") }, signal },
  );

export const createBookingReservation = (input: CreateBookingInput) =>
  apiClient.post<{
    booking: { id: string; voucherNumber: string | null };
    payment: { status: string };
  }>("/booking/reservations", input);
