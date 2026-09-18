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
const ageOnDate = (birthDate: string, onDate: string): number | null => {
  const birth = date(birthDate);
  const target = date(onDate);
  if (birth > target) return null;
  let age = target.getUTCFullYear() - birth.getUTCFullYear();
  const birthdayThisYear = new Date(
    Date.UTC(target.getUTCFullYear(), birth.getUTCMonth(), birth.getUTCDate()),
  );
  if (birthdayThisYear > target) age -= 1;
  return age;
};
const isValidDate = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = date(value);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
};
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

const numericEpteraReference = (value: string | null): string | null => {
  const normalized = value?.trim() ?? "";
  if (!/^\d+$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) && parsed > 0 ? normalized : null;
};

const readReservationIdentifier = (payload: unknown): string | null => {
  const response = record(payload);
  if (!response) return null;
  for (const key of ["reservation-id", "reservationId", "id"]) {
    const value = response[key];
    if (typeof value === "number" && Number.isSafeInteger(value) && value > 0)
      return String(value);
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
};

const readVoucherNumber = (payload: unknown): string | null => {
  const response = record(payload);
  if (!response) return null;
  const value = response["voucher-no"] ?? response.voucherNo;
  return typeof value === "string" || typeof value === "number"
    ? String(value).trim() || null
    : null;
};

const isPositiveSafeInteger = (value: number): boolean =>
  Number.isSafeInteger(value) && value > 0;

const selectedOfferPrice = (offer: EpteraOffer): number =>
  Number.isFinite(offer.discountedPrice) && offer.discountedPrice > 0
    ? offer.discountedPrice
    : offer.price;

const validateReservationOffer = (
  offer: EpteraOffer,
  input: CreateReservationBody,
) => {
  const invalidFields: string[] = [];
  const identifierFields = [
    ["hotel-id", offer.hotelId],
    ["room-type-id", offer.roomTypeId],
    ["rate-type-id", offer.rateTypeId],
    ["board-type-id", offer.boardTypeId],
    ["price-agency-id", offer.priceAgencyId],
  ] as const;
  for (const [field, value] of identifierFields) {
    if (!isPositiveSafeInteger(value)) invalidFields.push(field);
  }

  const currency = offer.currency.trim();
  if (!/^[A-Z]{3}$/.test(currency)) invalidFields.push("currency-code");
  if (!isValidDate(input.checkIn)) invalidFields.push("check-in");
  if (!isValidDate(input.checkOut)) invalidFields.push("check-out");
  if (!isPositiveSafeInteger(input.roomCount)) invalidFields.push("room-count");

  const price = selectedOfferPrice(offer);
  const totalPrice = price * input.roomCount;
  if (!Number.isFinite(price) || price <= 0) invalidFields.push("price");
  if (!Number.isFinite(totalPrice) || totalPrice <= 0)
    invalidFields.push("total-price");

  if (invalidFields.length > 0) {
    throw new HttpError(
      409,
      "EPTERA_OFFER_INVALID",
      "Выбранный тариф содержит некорректные данные.",
      { fields: invalidFields },
    );
  }

  return {
    currency,
    price,
    totalPrice,
  };
};

const buildEpteraReservationPayload = (input: {
  adults: number;
  checkIn: string;
  checkOut: string;
  guests: CreateReservationBody["guests"];
  nationality: string;
  offer: EpteraOffer;
  totalPrice: number;
  childAges: number[];
  currency: string;
}) => {
  const childGuests = input.guests.filter((guest) => guest.type !== "adult");
  const babyChildCount = input.childAges.filter((age) => age < 1).length;
  const elderChildCount = input.childAges.filter((age) => age >= 7).length;
  const youngerChildCount = input.childAges.filter(
    (age) => age >= 1 && age < 7,
  ).length;
  return {
    "adult-count": input.adults,
    "board-type-id": input.offer.boardTypeId,
    "check-in": input.checkIn,
    "check-out": input.checkOut,
    "currency-code": input.currency,
    "elder-child-count": elderChildCount,
    "guest-list": input.guests.map((guestEntry) => ({
      birthday: guestEntry.birthDate ?? null,
      country: input.nationality,
      name: guestEntry.firstName,
      surname: guestEntry.lastName,
      "title-id":
        guestEntry.type === "adult"
          ? 0
          : input.childAges[childGuests.indexOf(guestEntry)]! < 1
            ? 3
            : 2,
    })),
    nationality: input.nationality,
    "price-agency-id": input.offer.priceAgencyId,
    "rate-type-id": input.offer.rateTypeId,
    "room-type-id": input.offer.roomTypeId,
    "total-price": input.totalPrice,
    "baby-count": babyChildCount,
    "younger-child-count": youngerChildCount,
  } satisfies Record<string, unknown>;
};

const syncFailure = (error: unknown) => {
  if (error instanceof HttpError)
    return { code: error.code, message: error.message.slice(0, 500) };
  return {
    code: "EPTERA_RESERVATION_CREATE_FAILED",
    message: "Не удалось создать бронь в Eptera.",
  };
};

const paymentSyncFailure = (error: unknown) => {
  if (error instanceof HttpError)
    return { code: error.code, message: error.message.slice(0, 500) };
  return {
    code: "EPTERA_PAYMENT_SYNC_FAILED",
    message: "Не удалось передать оплату в Eptera.",
  };
};

const withoutEpteraPaymentSyncState = (booking: object) => {
  const publicBooking = { ...(booking as Record<string, unknown>) };
  for (const key of [
    "epteraPaymentSyncAttemptedAt",
    "epteraPaymentSyncErrorCode",
    "epteraPaymentSyncErrorMessage",
    "epteraPaymentSyncStatus",
    "epteraPaymentSyncedAt",
    "epteraReservationPayload",
    "epteraReservationSyncAttemptedAt",
    "epteraReservationSyncErrorCode",
    "epteraReservationSyncErrorMessage",
    "epteraReservationSyncStatus",
    "epteraReservationSyncedAt",
  ])
    delete publicBooking[key];
  return publicBooking;
};

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
    if (
      !isValidDate(input.checkIn) ||
      !isValidDate(input.checkOut) ||
      date(input.checkOut) <= date(input.checkIn)
    ) {
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
    const childGuests = input.guests.filter((guest) => guest.type !== "adult");
    if (childGuests.some((guest) => !isValidDate(guest.birthDate))) {
      throw new HttpError(
        400,
        "GUESTS_INVALID",
        "Укажите корректную дату рождения для каждого ребёнка.",
      );
    }
    const childAges = childGuests.map((guest) =>
      ageOnDate(guest.birthDate, input.checkIn),
    );
    if (childAges.some((age) => age === null || age < 0 || age > 17)) {
      throw new HttpError(
        400,
        "GUESTS_INVALID",
        "Дата рождения ребёнка должна соответствовать возрасту до 18 лет на дату заезда.",
      );
    }
    if (
      input.guests.some((guest) =>
        guest.type === "adult"
          ? guest.birthDate !== undefined && !isValidDate(guest.birthDate)
          : !isValidDate(guest.birthDate),
      )
    ) {
      throw new HttpError(
        400,
        "GUESTS_INVALID",
        "Укажите корректную дату рождения для каждого ребёнка.",
      );
    }
    const offers = await eptera.getOffers({
      adults: input.adults,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      childAges: childAges as number[],
      currency: input.currency,
      language: "ru",
      nationality: input.nationality,
      roomCount: input.roomCount,
    });
    const offer = offers.find((candidate) => candidate.id === input.offerId);
    if (
      !offer ||
      (offer.roomToSell !== null && offer.roomToSell < input.roomCount)
    ) {
      throw new HttpError(
        409,
        "OFFER_UNAVAILABLE",
        "Выбранный тариф больше недоступен. Выберите другой вариант.",
      );
    }
    const reservationOffer = validateReservationOffer(offer, input);
    const phone = normalizePhone(input.contact.phone);
    const typedChildAges = childAges as number[];
    const epteraReservationPayload = buildEpteraReservationPayload({
      adults: input.adults,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      childAges: typedChildAges,
      currency: reservationOffer.currency,
      guests: input.guests,
      nationality: input.nationality,
      offer,
      totalPrice: reservationOffer.totalPrice,
    });
    const totalAmount = reservationOffer.totalPrice;
    const guest = await repository.findOrCreateGuest({
      email: input.contact.email.toLowerCase(),
      fullName: `${input.contact.firstName} ${input.contact.lastName}`,
      phone,
    });
    const booking = await repository.createGuestBooking({
      checkInDate: date(input.checkIn),
      checkOutDate: date(input.checkOut),
      contactComment: input.notes ?? null,
      contactEmail: input.contact.email.toLowerCase(),
      contactFirstName: input.contact.firstName,
      contactLastName: input.contact.lastName,
      contactPhone: phone,
      currency: reservationOffer.currency,
      epteraReservationId: null,
      epteraReservationPayload: JSON.parse(
        JSON.stringify(epteraReservationPayload),
      ),
      guestsCount: input.guests.length,
      guestList: JSON.parse(JSON.stringify(input.guests)),
      roomName: offer.roomType,
      selectedOffer: JSON.parse(JSON.stringify(offer)),
      paymentMethod: input.paymentMethod,
      totalAmount,
      userId: guest.id,
      voucherNumber: null,
    });
    const paymentAmount =
      input.paymentMethod === "first_night"
        ? totalAmount / nightsBetween(input.checkIn, input.checkOut)
        : totalAmount;
    let payment;
    try {
      payment = await yookassa.createPayment({
        amount: amountText(paymentAmount),
        bookingId: booking.id,
        currency: offer.currency,
        description: `Бронирование ${booking.id}`,
        customer: { email: input.contact.email.toLowerCase(), phone },
        returnUrl: input.returnUrl,
      });
    } catch (error) {
      await repository
        .markPaymentCreationFailed({ bookingId: booking.id })
        .catch(() => undefined);
      throw error;
    }
    const savedBooking = await repository.updatePayment({
      bookingId: booking.id,
      paymentAmount,
      paymentId: payment.id,
      paymentStatus: payment.status,
      status: "awaiting_payment",
    });
    const publicBooking = withoutEpteraPaymentSyncState(savedBooking);
    return {
      booking: {
        ...publicBooking,
        totalAmount: publicBooking.totalAmount?.toString() ?? null,
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
    const paymentAmount = Number(payment.amount.value);
    if (!paid) {
      if (booking.paymentStatus === "succeeded") return booking;
      return repository.updatePayment({
        bookingId: booking.id,
        paymentAmount,
        paymentId: payment.id,
        paymentStatus: payment.status,
        status: booking.status,
      });
    }
    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      throw new HttpError(
        502,
        "PAYMENT_AMOUNT_INVALID",
        "Платёжный сервис вернул некорректную сумму.",
      );
    }
    const currency = payment.amount.currency.trim();
    if (!currency) {
      throw new HttpError(
        502,
        "PAYMENT_CURRENCY_INVALID",
        "Платёжный сервис вернул некорректную валюту.",
      );
    }
    const expectedAmount = Number(booking.paymentAmount?.toString());
    if (
      !Number.isFinite(expectedAmount) ||
      Math.abs(expectedAmount - paymentAmount) > 0.005
    ) {
      throw new HttpError(
        409,
        "PAYMENT_AMOUNT_MISMATCH",
        "Сумма платежа не совпадает с суммой заказа.",
      );
    }
    if (currency.toUpperCase() !== booking.currency.toUpperCase()) {
      throw new HttpError(
        409,
        "PAYMENT_CURRENCY_MISMATCH",
        "Валюта платежа не совпадает с валютой заказа.",
      );
    }
    if (
      booking.paymentStatus === "succeeded" &&
      booking.epteraPaymentSyncStatus === "succeeded"
    )
      return booking;
    if (
      booking.paymentStatus === "succeeded" &&
      !booking.epteraReservationId &&
      booking.epteraReservationSyncStatus !== "pending"
    )
      return booking;
    if (
      booking.paymentStatus === "succeeded" &&
      booking.epteraReservationId &&
      booking.epteraPaymentSyncStatus !== "pending"
    )
      return booking;

    let savedPayment = await repository.markYooKassaPaymentSucceeded({
      bookingId: booking.id,
      paymentAmount,
      paymentId: payment.id,
    });
    if (!savedPayment.epteraReservationId) {
      if (savedPayment.epteraReservationSyncStatus !== "pending")
        return savedPayment;
      const reservationAttemptedAt = new Date();
      const reservationClaimed =
        await repository.claimEpteraReservationCreation({
          attemptedAt: reservationAttemptedAt,
          bookingId: booking.id,
        });
      if (!reservationClaimed) return repository.findBooking(booking.id);

      try {
        const reservationPayload = record(
          savedPayment.epteraReservationPayload,
        );
        if (!reservationPayload)
          throw new HttpError(
            409,
            "EPTERA_RESERVATION_PAYLOAD_MISSING",
            "Для оплаченного заказа не сохранены данные бронирования.",
          );
        const epteraResponse =
          await eptera.createReservation(reservationPayload);
        const reservationId = readReservationIdentifier(epteraResponse);
        if (!reservationId)
          throw new HttpError(
            502,
            "EPTERA_RESPONSE_INVALID",
            "Сервис бронирования вернул неполный ответ.",
          );
        const reservationSaved = await repository.markEpteraReservationCreated({
          attemptedAt: reservationAttemptedAt,
          bookingId: booking.id,
          reservationId,
          syncedAt: new Date(),
          voucherNumber: readVoucherNumber(epteraResponse),
        });
        if (reservationSaved.count !== 1)
          return repository.findBooking(booking.id);
      } catch (error) {
        const failure = syncFailure(error);
        await repository
          .markEpteraReservationSyncFailed({
            attemptedAt: reservationAttemptedAt,
            bookingId: booking.id,
            errorCode: failure.code,
            errorMessage: failure.message,
          })
          .catch(() => undefined);
        return repository.findBooking(booking.id);
      }
      savedPayment = (await repository.findBooking(booking.id)) ?? savedPayment;
    }

    if (savedPayment.epteraPaymentSyncStatus === "succeeded")
      return savedPayment;
    const paymentAttemptedAt = new Date();
    const paymentClaimed = await repository.claimEpteraPaymentSync({
      attemptedAt: paymentAttemptedAt,
      bookingId: booking.id,
    });
    if (!paymentClaimed) return repository.findBooking(booking.id);

    try {
      const bookingReference =
        numericEpteraReference(savedPayment.epteraReservationId) ??
        numericEpteraReference(savedPayment.voucherNumber);
      if (!bookingReference)
        throw new HttpError(
          409,
          "EPTERA_BOOKING_REFERENCE_INVALID",
          "Не удалось определить номер бронирования для передачи оплаты.",
        );
      await eptera.addPayment({
        amount: paymentAmount,
        bookingReference,
        currency,
      });
    } catch (error) {
      const failure = paymentSyncFailure(error);
      await repository
        .markEpteraPaymentSyncFailed({
          attemptedAt: paymentAttemptedAt,
          bookingId: booking.id,
          errorCode: failure.code,
          errorMessage: failure.message,
        })
        .catch(() => undefined);
      return repository.findBooking(booking.id);
    }

    await repository.markEpteraPaymentSyncSucceeded({
      attemptedAt: paymentAttemptedAt,
      bookingId: booking.id,
      syncedAt: new Date(),
    });
    return repository.findBooking(booking.id);
  },
});

export type BookingService = ReturnType<typeof createBookingService>;
