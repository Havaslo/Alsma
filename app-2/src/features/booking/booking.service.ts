import { HttpError } from "../../lib/http/http-error.js";
import type { BookingRepository } from "./booking.repository.js";
import type { CreateReservationBody, OffersQuery } from "./booking.schemas.js";
import type { EpteraClient, EpteraOffer } from "./eptera.client.js";

const normalizePhone = (value: string): string => {
  let digits = value.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("8"))
    digits = `7${digits.slice(1)}`;
  if (digits.length !== 11 || !digits.startsWith("7")) {
    throw new HttpError(
      400,
      "PHONE_INVALID",
      "Введите корректный номер телефона.",
    );
  }
  return `+${digits}`;
};

const date = (value: string): Date => new Date(`${value}T00:00:00.000Z`);
const splitName = (name: string) => name.trim().split(/\s+/, 2);
const record = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

export const createBookingService = (
  repository: BookingRepository,
  eptera: EpteraClient,
) => ({
  offers: async (input: OffersQuery) => {
    if (date(input.checkOut) <= date(input.checkIn)) {
      throw new HttpError(
        400,
        "DATES_INVALID",
        "Дата выезда должна быть позже даты заезда.",
      );
    }
    return {
      offers: await eptera.getOffers(input),
      search: input,
    };
  },
  createReservation: async (input: CreateReservationBody) => {
    if (date(input.checkOut) <= date(input.checkIn)) {
      throw new HttpError(
        400,
        "DATES_INVALID",
        "Дата выезда должна быть позже даты заезда.",
      );
    }
    if (
      input.guests.filter((guest) => guest.type === "adult").length !==
      input.adults
    ) {
      throw new HttpError(
        400,
        "GUESTS_INVALID",
        "Количество взрослых гостей не совпадает с параметрами поиска.",
      );
    }
    const offers = await eptera.getOffers({
      adults: input.adults,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      childAges: input.childAges,
      currency: input.currency,
      language: "ru",
      nationality: input.nationality,
      roomCount: input.roomCount,
    });
    const offer = offers.find((candidate) => candidate.id === input.offerId);
    if (!offer || offer.roomToSell < 1) {
      throw new HttpError(
        409,
        "OFFER_UNAVAILABLE",
        "Выбранный тариф больше недоступен. Выберите другой вариант.",
      );
    }
    const phone = normalizePhone(input.contact.phone);
    const guest = await repository.findOrCreateGuest({
      email: input.contact.email.toLowerCase(),
      fullName: `${input.contact.firstName} ${input.contact.lastName}`,
      phone,
    });
    const response = await eptera.createReservation({
      "adult-count": input.adults,
      "board-type-id": offer.boardTypeId,
      "check-in": input.checkIn,
      "check-out": input.checkOut,
      "contact-email": input.contact.email,
      "contact-first-name": input.contact.firstName,
      "contact-last-name": input.contact.lastName,
      "contact-phone": phone,
      "currency-code": offer.currency,
      "elder-child-count": input.childAges.filter((age) => age >= 7).length,
      "guest-list": input.guests.map((guestEntry) => ({
        birthday: guestEntry.birthDate,
        country: input.nationality,
        name: guestEntry.firstName,
        surname: guestEntry.lastName,
        "title-id":
          guestEntry.type === "adult" ? 0 : guestEntry.type === "child" ? 2 : 3,
      })),
      "payment-type": 2,
      "price-agency-id": offer.priceAgencyId,
      "rate-code-id": offer.rateCodeId,
      "rate-type-id": offer.rateTypeId,
      "res-notes": input.notes,
      "room-count": input.roomCount,
      "room-type-id": offer.roomTypeId,
      "total-price": offer.discountedPrice || offer.price,
      "younger-child-count": input.childAges.filter((age) => age < 7).length,
    });
    const epteraResult = record(response);
    const reservationId = epteraResult
      ? String(
          epteraResult["reservation-id"] ??
            epteraResult.reservationId ??
            epteraResult.id ??
            "",
        ) || null
      : null;
    const voucherNumber = epteraResult
      ? String(epteraResult["voucher-no"] ?? epteraResult.voucherNo ?? "") ||
        null
      : null;
    const booking = await repository.createGuestBooking({
      checkInDate: date(input.checkIn),
      checkOutDate: date(input.checkOut),
      contactEmail: input.contact.email.toLowerCase(),
      contactPhone: phone,
      currency: offer.currency,
      epteraReservationId: reservationId,
      guestsCount: input.guests.length,
      roomName: offer.roomType,
      selectedOffer: JSON.parse(JSON.stringify(offer)),
      totalAmount: (offer.discountedPrice || offer.price) * input.roomCount,
      userId: guest.id,
      voucherNumber,
    });
    return {
      booking: {
        ...booking,
        totalAmount: booking.totalAmount?.toString() ?? null,
      },
      payment: { status: "payment_pending" },
    };
  },
});

export type BookingService = ReturnType<typeof createBookingService>;
