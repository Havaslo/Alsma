import { HttpError } from "../../lib/http/http-error.js";
import type { BookingRepository } from "./booking.repository.js";
import type {
  CalendarPricesQuery,
  CreateReservationBody,
  OffersQuery,
} from "./booking.schemas.js";
import type { EpteraClient, EpteraOffer } from "./eptera.client.js";
import type { YooKassaClient, YooPayment } from "./yookassa.client.js";

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
const record = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
const nightsBetween = (checkIn: string, checkOut: string) =>
  Math.max(
    1,
    Math.round(
      (date(checkOut).getTime() - date(checkIn).getTime()) / 86_400_000,
    ),
  );
const amountText = (value: number) => value.toFixed(2);

type CalendarPrice = {
  readonly date: string;
  readonly discount: boolean;
  readonly price: number;
};
const calendarCache = new Map<
  string,
  { expiresAt: number; items: CalendarPrice[] }
>();
const dateKey = (date: Date) =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
const nextDate = (date: Date) => new Date(date.getTime() + 86_400_000);

export const createBookingService = (
  repository: BookingRepository,
  eptera: EpteraClient,
  yookassa: YooKassaClient,
) => ({
  offers: async (input: OffersQuery) => {
    if (date(input.checkOut) <= date(input.checkIn)) {
      throw new HttpError(
        400,
        "DATES_INVALID",
        "Дата выезда должна быть позже даты заезда.",
      );
    }
    return { offers: await eptera.getOffers(input), search: input };
  },
  calendarPrices: async (input: CalendarPricesQuery) => {
    const cacheKey = JSON.stringify(input);
    const cached = calendarCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return { items: cached.items };
    const [yearText, monthText] = input.month.split("-");
    const year = Number(yearText);
    const month = Number(monthText);
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const dates = Array.from(
      { length: daysInMonth },
      (_, index) => new Date(Date.UTC(year, month - 1, index + 1)),
    );
    const items: CalendarPrice[] = [];
    let cursor = 0;
    const worker = async () => {
      while (cursor < dates.length) {
        const current = dates[cursor++];
        if (!current) return;
        try {
          const offers = await eptera.getOffers({
            adults: input.adults,
            checkIn: dateKey(current),
            checkOut: dateKey(nextDate(current)),
            childAges: input.childAges,
            currency: input.currency,
            language: input.language,
            nationality: input.nationality,
            roomCount: input.roomCount,
          });
          const available = offers.filter(
            (offer) =>
              offer.roomToSell === null || offer.roomToSell >= input.roomCount,
          );
          const cheapest = available.reduce<EpteraOffer | null>(
            (lowest, offer) => {
              const value = offer.discountedPrice || offer.price;
              const lowestValue = lowest
                ? lowest.discountedPrice || lowest.price
                : Number.POSITIVE_INFINITY;
              return value < lowestValue ? offer : lowest;
            },
            null,
          );
          if (cheapest) {
            items.push({
              date: dateKey(current),
              discount:
                cheapest.discountedPrice > 0 &&
                cheapest.discountedPrice < cheapest.price,
              price: cheapest.discountedPrice || cheapest.price,
            });
          }
        } catch {
          // A missing daily price must not make the whole calendar unavailable.
        }
      }
    };
    await Promise.all(Array.from({ length: 4 }, () => worker()));
    items.sort((left, right) => left.date.localeCompare(right.date));
    calendarCache.set(cacheKey, { expiresAt: Date.now() + 5 * 60_000, items });
    return { items };
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
    if (!offer || offer.roomToSell === 0) {
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
    const epteraResponse = await eptera.createReservation({
      "adult-count": input.adults,
      "baby-count": input.childAges.filter((age) => age < 1).length,
      "board-type-id": offer.boardTypeId,
      "check-in": input.checkIn,
      "check-out": input.checkOut,
      "contact-email": input.contact.email,
      "contact-first-name": input.contact.firstName,
      "contact-last-name": input.contact.lastName,
      "contact-phone": phone,
      "currency-code": offer.currency,
      "guest-list": input.guests.map((guestEntry) => ({
        birthday: guestEntry.birthDate,
        country: input.nationality,
        name: guestEntry.firstName,
        surname: guestEntry.lastName,
        "title-id":
          guestEntry.type === "adult" ? 0 : guestEntry.type === "child" ? 2 : 3,
      })),
      nationality: input.nationality,
      "payment-type": 2,
      "price-agency-id": offer.priceAgencyId,
      "rate-code-id": offer.rateCodeId,
      "rate-type-id": offer.rateTypeId,
      "res-notes": input.notes,
      "room-count": input.roomCount,
      "room-type-id": offer.roomTypeId,
      "total-price": offer.discountedPrice || offer.price,
      "younger-child-count": input.childAges.filter(
        (age) => age >= 1 && age < 7,
      ).length,
    });
    const epteraResult = record(epteraResponse);
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
    const totalAmount =
      (offer.discountedPrice || offer.price) * input.roomCount;
    const booking = await repository.createGuestBooking({
      checkInDate: date(input.checkIn),
      checkOutDate: date(input.checkOut),
      contactComment: input.notes ?? null,
      contactEmail: input.contact.email.toLowerCase(),
      contactFirstName: input.contact.firstName,
      contactLastName: input.contact.lastName,
      contactPhone: phone,
      currency: offer.currency,
      epteraReservationId: reservationId,
      guestsCount: input.guests.length,
      guestList: JSON.parse(JSON.stringify(input.guests)),
      roomName: offer.roomType,
      selectedOffer: JSON.parse(JSON.stringify(offer)),
      paymentMethod: input.paymentMethod,
      totalAmount,
      userId: guest.id,
      voucherNumber,
    });
    const paymentAmount =
      input.paymentMethod === "first_night"
        ? totalAmount / nightsBetween(input.checkIn, input.checkOut)
        : totalAmount;
    const payment = await yookassa.createPayment({
      amount: amountText(paymentAmount),
      bookingId: booking.id,
      currency: offer.currency,
      description: `Бронирование ${voucherNumber ?? booking.id}`,
      customer: { email: input.contact.email.toLowerCase(), phone },
      returnUrl: input.returnUrl,
    });
    const savedBooking = await repository.updatePayment({
      bookingId: booking.id,
      paymentAmount,
      paymentId: payment.id,
      paymentStatus: payment.status,
      status: "awaiting_payment",
    });
    return {
      booking: {
        ...savedBooking,
        totalAmount: savedBooking.totalAmount?.toString() ?? null,
      },
      payment: {
        amount: payment.amount,
        confirmationUrl: payment.confirmation?.confirmation_url ?? null,
        id: payment.id,
        status: payment.status,
      },
    };
  },
  reconcilePayment: async (payment: YooPayment) => {
    const bookingId = payment.metadata?.bookingId;
    const booking = bookingId
      ? await repository.findBooking(bookingId)
      : await repository.findBookingByPaymentId(payment.id);
    if (!booking || booking.paymentId !== payment.id) return null;
    const paid = payment.status === "succeeded" && payment.paid;
    return repository.updatePayment({
      bookingId: booking.id,
      paymentAmount: Number(payment.amount.value),
      paymentId: payment.id,
      paymentStatus: paid ? "succeeded" : payment.status,
      status: paid ? "confirmed" : booking.status,
    });
  },
});

export type BookingService = ReturnType<typeof createBookingService>;
