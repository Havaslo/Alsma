import { HttpError } from "../../lib/http/http-error.js";
import type { BookingRepository } from "./booking.repository.js";
import type {
  BookingCancellationRequestBody,
  CalendarPricesQuery,
  CreateReservationBody,
  OffersQuery,
} from "./booking.schemas.js";
import type { EpteraClient, EpteraOffer } from "./eptera.client.js";
import type {
  YooKassaClient,
  YooPayment,
  YooRefund,
} from "./yookassa.client.js";

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
const paymentReturnUrl = (returnUrl: string, bookingId: string) => {
  const url = new URL(returnUrl);
  url.searchParams.set("bookingId", bookingId);
  return url.toString();
};
const EPTERA_PAYMENT_SYNC_STALE_AFTER_MS = 60_000;
export const BOOKING_PAYMENT_DEADLINE_MS = 30 * 60_000;
const EXPIRED_BOOKING_BATCH_SIZE = 25;

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

const withoutEpteraPaymentSyncState = <T extends Record<string, unknown>>(
  booking: T,
) => {
  const {
    cancellationAttemptedAt: _cancellationAttemptedAt,
    cancellationErrorCode: _cancellationErrorCode,
    cancellationErrorMessage: _cancellationErrorMessage,
    cancellationReason: _cancellationReason,
    cancellationRequestedAt: _cancellationRequestedAt,
    cancellationStatus: _cancellationStatus,
    cancelledAt: _cancelledAt,
    epteraPaymentSyncAttemptedAt: _epteraPaymentSyncAttemptedAt,
    epteraPaymentSyncStatus: _epteraPaymentSyncStatus,
    epteraPaymentSyncedAt: _epteraPaymentSyncedAt,
    paymentDeadlineAt: _paymentDeadlineAt,
    refundAmount: _refundAmount,
    refundErrorCode: _refundErrorCode,
    refundErrorMessage: _refundErrorMessage,
    refundId: _refundId,
    refundRequestedAt: _refundRequestedAt,
    refundStatus: _refundStatus,
    refundedAt: _refundedAt,
    ...publicBooking
  } = booking;
  return publicBooking;
};

const cancelReservationBestEffort = async (
  eptera: Pick<EpteraClient, "cancelReservation">,
  reservationId: string,
) => {
  const numericReservationId = numericEpteraReference(reservationId);
  if (!numericReservationId) return false;
  try {
    await eptera.cancelReservation(Number(numericReservationId));
    return true;
  } catch {
    // Keep the original persistence or payment error as the public failure.
    return false;
  }
};

const reservationIdsFromJson = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];

const cancellationFailure = (error: unknown) => {
  if (error instanceof HttpError)
    return { code: error.code, message: error.message.slice(0, 500) };
  return {
    code: "EPTERA_CANCELLATION_FAILED",
    message: "Не удалось автоматически отменить бронь в Eptera.",
  };
};

const isPaidPayment = (payment: YooPayment): boolean =>
  payment.status === "succeeded" && payment.paid;

const refundAmount = (refund: YooRefund): number => {
  const amount = Number(refund.amount.value);
  if (!Number.isFinite(amount) || amount <= 0)
    throw new HttpError(
      502,
      "YOOKASSA_REFUND_AMOUNT_INVALID",
      "Платёжный сервис вернул некорректную сумму возврата.",
    );
  return amount;
};

type ReservationRoom = NonNullable<CreateReservationBody["rooms"]>[number];

const validateGuestDetails = (
  guests: ReservationRoom["guests"],
  adults: number,
  checkIn: string,
) => {
  if (guests.filter((guest) => guest.type === "adult").length !== adults) {
    throw new HttpError(
      400,
      "GUESTS_INVALID",
      "Количество взрослых гостей не совпадает с параметрами поиска.",
    );
  }
  const childGuests = guests.filter((guest) => guest.type !== "adult");
  if (childGuests.some((guest) => !isValidDate(guest.birthDate))) {
    throw new HttpError(
      400,
      "GUESTS_INVALID",
      "Укажите корректную дату рождения для каждого ребёнка.",
    );
  }
  const childAges = childGuests.map((guest) =>
    ageOnDate(guest.birthDate, checkIn),
  );
  if (childAges.some((age) => age === null || age < 0 || age > 17)) {
    throw new HttpError(
      400,
      "GUESTS_INVALID",
      "Дата рождения ребёнка должна соответствовать возрасту до 18 лет на дату заезда.",
    );
  }
  if (
    guests.some((guest) =>
      guest.type === "adult"
        ? guest.birthDate !== undefined && !isValidDate(guest.birthDate)
        : !isValidDate(guest.birthDate),
    )
  ) {
    throw new HttpError(
      400,
      "GUESTS_INVALID",
      "Укажите корректную дату рождения каждого гостя.",
    );
  }
  return { childAges: childAges as number[], childGuests };
};

const reservationPayload = (
  input: CreateReservationBody,
  room: ReservationRoom,
  offer: EpteraOffer,
  reservationOffer: ReturnType<typeof validateReservationOffer>,
  childAges: number[],
  childGuests: ReservationRoom["guests"],
): Parameters<EpteraClient["createReservation"]>[0] => {
  let childIndex = 0;
  const babyChildCount = childAges.filter((age) => age < 1).length;
  const elderChildCount = childAges.filter((age) => age >= 7).length;
  const youngerChildCount = childAges.filter(
    (age) => age >= 1 && age < 7,
  ).length;
  return {
    "adult-count": room.adults,
    "board-type-id": offer.boardTypeId,
    "check-in": input.checkIn,
    "check-out": input.checkOut,
    "currency-code": reservationOffer.currency,
    "elder-child-count": elderChildCount,
    "guest-list": room.guests.map((guestEntry) => {
      const childPosition = guestEntry.type === "adult" ? null : childIndex++;
      return {
        birthday: guestEntry.birthDate ?? null,
        country: input.nationality,
        name: guestEntry.firstName,
        surname: guestEntry.lastName,
        "title-id":
          guestEntry.type === "adult"
            ? 0
            : childAges[childPosition ?? 0]! < 1
              ? 3
              : 2,
      };
    }),
    nationality: input.nationality,
    "price-agency-id": offer.priceAgencyId,
    "rate-type-id": offer.rateTypeId,
    "room-type-id": offer.roomTypeId,
    "total-price": reservationOffer.totalPrice,
    "baby-count": babyChildCount,
    "younger-child-count": youngerChildCount,
  };
};

const reconcileGroupPayment = async (
  repository: BookingRepository,
  eptera: EpteraClient,
  group: NonNullable<Awaited<ReturnType<BookingRepository["findGroup"]>>>,
  payment: YooPayment,
) => {
  const paid = isPaidPayment(payment);
  const paymentAmount = Number(payment.amount.value);
  if (!paid) {
    return repository.updateGroupPayment({
      groupId: group.id,
      paymentAmount: Number.isFinite(paymentAmount) ? paymentAmount : 0,
      paymentId: payment.id,
      paymentStatus: payment.status,
      status: group.status,
    });
  }
  if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
    throw new HttpError(
      502,
      "PAYMENT_AMOUNT_INVALID",
      "Платёжный сервис вернул некорректную сумму.",
    );
  }
  if (
    payment.amount.currency.trim().toUpperCase() !==
    group.currency.trim().toUpperCase()
  ) {
    throw new HttpError(
      502,
      "PAYMENT_CURRENCY_INVALID",
      "Платёжный сервис вернул другую валюту.",
    );
  }
  const nights = Math.max(
    1,
    Math.round(
      (group.checkOutDate.getTime() - group.checkInDate.getTime()) / 86_400_000,
    ),
  );
  const amounts = group.bookings.map((booking) =>
    group.paymentMethod === "first_night"
      ? Number((Number(booking.totalAmount ?? 0) / nights).toFixed(2))
      : Number(Number(booking.totalAmount ?? 0).toFixed(2)),
  );
  const expectedAmount = Number(
    amounts.reduce((sum, amount) => sum + amount, 0).toFixed(2),
  );
  if (Math.abs(expectedAmount - paymentAmount) > 0.01) {
    throw new HttpError(
      409,
      "PAYMENT_AMOUNT_MISMATCH",
      "Сумма платежа не совпадает с суммой выбранных номеров.",
    );
  }
  if (group.cancellationStatus === "processing") return group;
  const savedGroup = await repository.markGroupPaymentSucceeded({
    bookings: group.bookings.map((booking, index) => ({
      id: booking.id,
      paymentAmount: amounts[index] ?? 0,
    })),
    groupId: group.id,
    paymentAmount,
    paymentId: payment.id,
  });
  if (!savedGroup || savedGroup.paymentStatus !== "succeeded")
    return savedGroup;

  let syncError: unknown = null;
  for (const booking of savedGroup.bookings) {
    if (booking.epteraPaymentSyncStatus === "succeeded") continue;
    const attemptedAt = new Date();
    const claimed = await repository.claimEpteraPaymentSync({
      attemptedAt,
      bookingId: booking.id,
      staleBefore: new Date(
        attemptedAt.getTime() - EPTERA_PAYMENT_SYNC_STALE_AFTER_MS,
      ),
    });
    if (!claimed) continue;
    try {
      const bookingReference = numericEpteraReference(
        booking.epteraReservationId,
      );
      if (!bookingReference) {
        throw new HttpError(
          409,
          "EPTERA_BOOKING_REFERENCE_INVALID",
          "Не удалось определить номер бронирования для передачи оплаты.",
        );
      }
      await eptera.addPayment({
        amount: Number(booking.paymentAmount ?? 0),
        bookingReference,
        currency: payment.amount.currency,
      });
      await repository.markEpteraPaymentSyncSucceeded({
        attemptedAt,
        bookingId: booking.id,
        syncedAt: new Date(),
      });
    } catch (error) {
      await repository
        .markEpteraPaymentSyncFailed({
          attemptedAt,
          bookingId: booking.id,
        })
        .catch(() => undefined);
      syncError =
        error instanceof HttpError
          ? error
          : new HttpError(
              502,
              "EPTERA_PAYMENT_SYNC_FAILED",
              "Не удалось передать оплату в систему бронирования.",
            );
    }
  }
  const confirmedGroup = await repository.markGroupConfirmedIfAllSynced(
    group.id,
  );
  if (syncError) throw syncError;
  return confirmedGroup;
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
const normalizeProviderText = (value: string): string =>
  value
    .toLocaleLowerCase("ru-RU")
    .replaceAll("ё", "е")
    .replace(/\s+/gu, " ")
    .trim();
const normalizeRateType = (value: string): string =>
  normalizeProviderText(value)
    .replace(/[()]/gu, "")
    .replace(/[‐‑‒–—-]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
const isRussianBathCottage = (roomType: string): boolean =>
  normalizeProviderText(roomType).includes("русская баня");
const isNoMealBoard = (boardType: string): boolean => {
  const normalized = normalizeProviderText(boardType);
  return (
    normalized.length === 0 ||
    normalized.includes("без питания") ||
    normalized === "ro" ||
    normalized.includes("room only")
  );
};
const isFullBoard = (boardType: string): boolean => {
  const normalized = normalizeProviderText(boardType);
  return (
    normalized === "fb" ||
    normalized === "full board" ||
    normalized.includes("полный пансион")
  );
};
const STANDARD_FULL_BOARD_RATES = new Set([
  "все включено",
  "осенний хит",
  "выгодное бронирование",
]);
const BATH_COTTAGE_FULL_BOARD_RATES = new Set([
  "все включено",
  "осенний хит",
  "осенний хит стандарт",
]);
const BATH_COTTAGE_NO_MEAL_RATES = new Set([
  "свободный",
  "свободный без питания",
]);
const filterBookingOffers = (offers: readonly EpteraOffer[]): EpteraOffer[] =>
  offers.filter((offer) => {
    const rateType = normalizeRateType(offer.rateType);
    if (isRussianBathCottage(offer.roomType))
      return (
        (isFullBoard(offer.boardType) &&
          BATH_COTTAGE_FULL_BOARD_RATES.has(rateType)) ||
        (BATH_COTTAGE_NO_MEAL_RATES.has(rateType) &&
          isNoMealBoard(offer.boardType))
      );
    return (
      isFullBoard(offer.boardType) && STANDARD_FULL_BOARD_RATES.has(rateType)
    );
  });

export const createBookingService = (
  repository: BookingRepository,
  eptera: EpteraClient,
  yookassa: YooKassaClient,
) => {
  const getBookableOffers = async (
    input: Parameters<EpteraClient["getOffers"]>[0],
  ) => filterBookingOffers(await eptera.getOffers(input));
  const service = {
    offers: async (input: OffersQuery) => {
      if (date(input.checkOut) <= date(input.checkIn)) {
        throw new HttpError(
          400,
          "DATES_INVALID",
          "Дата выезда должна быть позже даты заезда.",
        );
      }
      return { offers: await getBookableOffers(input), search: input };
    },
    calendarPrices: async (input: CalendarPricesQuery) => {
      const cacheKey = JSON.stringify(input);
      const cached = calendarCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now())
        return { items: cached.items };
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
            const offers = await getBookableOffers({
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
                offer.roomToSell === null ||
                offer.roomToSell >= input.roomCount,
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
      calendarCache.set(cacheKey, {
        expiresAt: Date.now() + 5 * 60_000,
        items,
      });
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
      if (input.rooms?.length) {
        if (input.rooms.length !== input.roomCount) {
          throw new HttpError(
            400,
            "ROOMS_INVALID",
            "Количество выбранных номеров не совпадает с параметрами поиска.",
          );
        }
        const phone = normalizePhone(input.contact.phone);
        const roomData: Array<{
          readonly childAges: number[];
          readonly childGuests: ReservationRoom["guests"];
          readonly offer: EpteraOffer;
          readonly reservationOffer: ReturnType<
            typeof validateReservationOffer
          >;
          readonly room: ReservationRoom;
        }> = [];
        let groupCurrency: string | null = null;
        for (const room of input.rooms) {
          const { childAges, childGuests } = validateGuestDetails(
            room.guests,
            room.adults,
            input.checkIn,
          );
          const offers = await getBookableOffers({
            adults: room.adults,
            checkIn: input.checkIn,
            checkOut: input.checkOut,
            childAges,
            currency: input.currency,
            language: "ru",
            nationality: input.nationality,
            roomCount: 1,
          });
          const offer = offers.find(
            (candidate) => candidate.id === room.offerId,
          );
          if (!offer || (offer.roomToSell !== null && offer.roomToSell < 1)) {
            throw new HttpError(
              409,
              "OFFER_UNAVAILABLE",
              "Один из выбранных тарифов больше недоступен. Выберите другой вариант.",
            );
          }
          const roomInput = {
            ...input,
            adults: room.adults,
            guests: room.guests,
            offerId: room.offerId,
            roomCount: 1,
          } satisfies CreateReservationBody;
          const reservationOffer = validateReservationOffer(offer, roomInput);
          if (groupCurrency && groupCurrency !== reservationOffer.currency) {
            throw new HttpError(
              409,
              "GROUP_CURRENCY_MISMATCH",
              "Выбранные тарифы должны быть в одной валюте.",
            );
          }
          groupCurrency = reservationOffer.currency;
          roomData.push({
            childAges,
            childGuests,
            offer,
            reservationOffer,
            room,
          });
        }

        const guest = await repository.findOrCreateGuest({
          email: input.contact.email.toLowerCase(),
          fullName: `${input.contact.firstName} ${input.contact.lastName}`,
          phone,
        });
        type CreatedBooking = {
          booking: Awaited<ReturnType<BookingRepository["createGuestBooking"]>>;
          paymentId?: string;
          payment?: YooPayment;
          paymentStatus: string;
          reservationId: string;
        };
        const createdBookings: CreatedBooking[] = [];
        let paymentCreated = false;
        try {
          for (const room of roomData) {
            const response = await eptera.createReservation(
              reservationPayload(
                input,
                room.room,
                room.offer,
                room.reservationOffer,
                room.childAges,
                room.childGuests,
              ),
            );
            const responseRecord = record(response);
            const reservationId = readReservationIdentifier(response);
            if (!reservationId) {
              throw new HttpError(
                502,
                "EPTERA_RESPONSE_INVALID",
                "Система бронирования вернула неполный ответ.",
              );
            }
            const paymentDeadlineAt = new Date(
              Date.now() + BOOKING_PAYMENT_DEADLINE_MS,
            );
            const voucherNumber = responseRecord
              ? String(
                  responseRecord["voucher-no"] ??
                    responseRecord.voucherNo ??
                    "",
                ) || null
              : null;
            const booking = await repository.createGuestBooking({
              checkInDate: date(input.checkIn),
              checkOutDate: date(input.checkOut),
              contactComment: input.notes ?? null,
              contactEmail: input.contact.email.toLowerCase(),
              contactFirstName: input.contact.firstName,
              contactLastName: input.contact.lastName,
              contactPhone: phone,
              currency: room.reservationOffer.currency,
              epteraReservationId: reservationId,
              guestsCount: room.room.guests.length,
              guestList: JSON.parse(JSON.stringify(room.room.guests)),
              paymentDeadlineAt,
              roomName: room.offer.roomType,
              selectedOffer: JSON.parse(JSON.stringify(room.offer)),
              paymentMethod: input.paymentMethod,
              totalAmount: room.reservationOffer.totalPrice,
              userId: guest.id,
              voucherNumber,
            });
            const createdBooking: CreatedBooking = {
              booking,
              paymentStatus: "payment_pending",
              reservationId,
            };
            createdBookings.push(createdBooking);
            const paymentAmount =
              input.paymentMethod === "first_night"
                ? Number(
                    amountText(
                      room.reservationOffer.totalPrice /
                        nightsBetween(input.checkIn, input.checkOut),
                    ),
                  )
                : Number(amountText(room.reservationOffer.totalPrice));
            const payment = await yookassa.createPayment({
              amount: amountText(paymentAmount),
              bookingId: booking.id,
              currency: room.reservationOffer.currency,
              description: `Бронирование ${voucherNumber ?? booking.id}`,
              customer: { email: input.contact.email.toLowerCase(), phone },
              returnUrl: paymentReturnUrl(input.returnUrl, booking.id),
            });
            paymentCreated = true;
            createdBooking.paymentId = payment.id;
            createdBooking.paymentStatus = payment.status;
            createdBooking.booking = await repository.updatePayment({
              bookingId: booking.id,
              paymentAmount,
              paymentId: payment.id,
              paymentStatus: payment.status,
              status: "awaiting_payment",
            });
            createdBooking.payment = payment;
          }

          const publicBookings = createdBookings.map(({ booking }) => {
            const publicBooking = withoutEpteraPaymentSyncState(
              booking as unknown as Record<string, unknown>,
            );
            return {
              ...publicBooking,
              totalAmount: publicBooking.totalAmount?.toString() ?? null,
            };
          });
          const payments = createdBookings.map(({ booking, payment }) => {
            if (!payment)
              throw new HttpError(
                502,
                "PAYMENT_CREATION_FAILED",
                "Не удалось создать платёж.",
              );
            return {
              amount: payment.amount,
              bookingId: booking.id,
              confirmationUrl: payment.confirmation?.confirmation_url ?? null,
              id: payment.id,
              roomName: booking.roomName,
              status: payment.status,
              voucherNumber: booking.voucherNumber,
            };
          });
          const firstPayment = payments[0];
          if (!firstPayment)
            throw new HttpError(
              502,
              "PAYMENT_CREATION_FAILED",
              "Не удалось создать платёж.",
            );
          return {
            booking: publicBookings[0],
            bookings: publicBookings,
            payments,
            payment: firstPayment,
          };
        } catch (error) {
          const cancellableBookings: CreatedBooking[] = [];
          const preflightFailures: Array<{
            bookingId: string;
            cancellationSucceeded: boolean;
            errorCode?: string;
            errorMessage?: string;
          }> = [];
          for (const createdBooking of createdBookings) {
            if (createdBooking.paymentStatus === "succeeded") continue;
            if (createdBooking.paymentId) {
              try {
                const latestPayment = await yookassa.getPayment(
                  createdBooking.paymentId,
                );
                if (isPaidPayment(latestPayment)) continue;
              } catch {
                preflightFailures.push({
                  bookingId: createdBooking.booking.id,
                  cancellationSucceeded: false,
                  errorCode: "YOOKASSA_STATUS_UNAVAILABLE",
                  errorMessage:
                    "Не удалось проверить статус платежа перед отменой брони.",
                });
                continue;
              }
            }
            cancellableBookings.push(createdBooking);
          }
          const cancellationResults = await Promise.all(
            cancellableBookings.map(async ({ booking, reservationId }) => ({
              bookingId: booking.id,
              cancellationSucceeded: await cancelReservationBestEffort(
                eptera,
                reservationId,
              ),
            })),
          );
          const allCancellationResults = [
            ...preflightFailures,
            ...cancellationResults,
          ];
          if (allCancellationResults.length > 0) {
            const failure = cancellationFailure(
              new HttpError(
                502,
                "EPTERA_CANCELLATION_FAILED",
                "Не удалось автоматически отменить все созданные брони.",
              ),
            );
            await repository.markBookingsCancelledAfterPartialFailure({
              attemptedAt: new Date(),
              bookings: allCancellationResults.map((result) =>
                result.cancellationSucceeded
                  ? result
                  : { ...failure, ...result },
              ),
            });
          }
          if (
            error instanceof HttpError &&
            /^(EPTERA|YOOKASSA)_/.test(error.code)
          ) {
            throw new HttpError(
              error.status,
              error.code,
              "Не удалось оформить выбранные номера. Попробуйте ещё раз.",
            );
          }
          if (!paymentCreated && !(error instanceof HttpError)) {
            throw new HttpError(
              502,
              "RESERVATION_CREATION_FAILED",
              "Не удалось оформить выбранные номера. Попробуйте ещё раз.",
            );
          }
          throw error;
        }
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
      const childGuests = input.guests.filter(
        (guest) => guest.type !== "adult",
      );
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
      const offers = await getBookableOffers({
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
      const babyChildCount = typedChildAges.filter((age) => age < 1).length;
      const elderChildCount = typedChildAges.filter((age) => age >= 7).length;
      const youngerChildCount = typedChildAges.filter(
        (age) => age >= 1 && age < 7,
      ).length;
      const epteraResponse = await eptera.createReservation({
        "adult-count": input.adults,
        "board-type-id": offer.boardTypeId,
        "check-in": input.checkIn,
        "check-out": input.checkOut,
        "currency-code": reservationOffer.currency,
        "elder-child-count": elderChildCount,
        "guest-list": input.guests.map((guestEntry) => ({
          birthday: guestEntry.birthDate ?? null,
          country: input.nationality,
          name: guestEntry.firstName,
          surname: guestEntry.lastName,
          "title-id":
            guestEntry.type === "adult"
              ? 0
              : typedChildAges[childGuests.indexOf(guestEntry)]! < 1
                ? 3
                : 2,
        })),
        nationality: input.nationality,
        "price-agency-id": offer.priceAgencyId,
        "rate-type-id": offer.rateTypeId,
        "room-type-id": offer.roomTypeId,
        "total-price": reservationOffer.totalPrice,
        "baby-count": babyChildCount,
        "younger-child-count": youngerChildCount,
      });
      const epteraResult = record(epteraResponse);
      const reservationId = readReservationIdentifier(epteraResponse);
      if (!reservationId) {
        throw new HttpError(
          502,
          "EPTERA_RESPONSE_INVALID",
          "Сервис бронирования вернул неполный ответ.",
        );
      }
      const paymentDeadlineAt = new Date(
        Date.now() + BOOKING_PAYMENT_DEADLINE_MS,
      );
      const voucherNumber = epteraResult
        ? String(epteraResult["voucher-no"] ?? epteraResult.voucherNo ?? "") ||
          null
        : null;
      const totalAmount = reservationOffer.totalPrice;
      try {
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
          epteraReservationId: reservationId,
          guestsCount: input.guests.length,
          guestList: JSON.parse(JSON.stringify(input.guests)),
          paymentDeadlineAt,
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
          returnUrl: paymentReturnUrl(input.returnUrl, booking.id),
        });
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
      } catch (error) {
        await cancelReservationBestEffort(eptera, reservationId);
        throw error;
      }
    },
    paymentStatus: async (input: { bookingId: string }) => {
      const booking = await repository.findBooking(input.bookingId);
      if (!booking) {
        throw new HttpError(
          404,
          "BOOKING_NOT_FOUND",
          "Бронирование не найдено.",
        );
      }
      if (!booking.paymentId) {
        return {
          booking: {
            epteraPaymentSyncStatus: booking.epteraPaymentSyncStatus,
            id: booking.id,
            paymentStatus: booking.paymentStatus,
            status: booking.status,
            voucherNumber: booking.voucherNumber,
          },
          payment: null,
        };
      }
      const payment = await yookassa.getPayment(booking.paymentId);
      try {
        await service.reconcilePayment(payment);
      } catch {
        // The payment result remains useful even if Eptera temporarily rejects
        // the separate payment synchronization request.
      }
      const currentBooking =
        (await repository.findBooking(booking.id)) ?? booking;
      return {
        booking: {
          epteraPaymentSyncStatus: currentBooking.epteraPaymentSyncStatus,
          id: currentBooking.id,
          paymentStatus: currentBooking.paymentStatus,
          status: currentBooking.status,
          voucherNumber: currentBooking.voucherNumber,
        },
        payment: {
          amount: payment.amount,
          confirmationUrl: payment.confirmation?.confirmation_url ?? null,
          id: payment.id,
          paid: payment.paid,
          status: payment.status,
        },
      };
    },
    requestCancellation: async (
      input: BookingCancellationRequestBody & { userId: string },
    ) => {
      const booking = await repository.findBookingForCancellation({
        bookingId: input.bookingId,
        userId: input.userId,
      });
      if (!booking)
        throw new HttpError(
          404,
          "BOOKING_NOT_FOUND",
          "Бронирование не найдено.",
        );
      if (booking.paymentStatus !== "succeeded")
        throw new HttpError(
          409,
          "BOOKING_NOT_PAID",
          "Запрос на отмену доступен после подтверждения оплаты.",
        );
      if (
        booking.cancellationStatus === "requested" ||
        booking.cancellationStatus === "processing" ||
        booking.cancellationStatus === "succeeded"
      ) {
        return booking;
      }

      const updated = await repository.requestBookingCancellation({
        bookingId: input.bookingId,
        reason: input.reason?.trim() || null,
        requestedAt: new Date(),
        userId: input.userId,
      });
      if (!updated)
        throw new HttpError(
          409,
          "BOOKING_CANCELLATION_CONFLICT",
          "Не удалось зарегистрировать запрос на отмену.",
        );
      if (updated.paymentStatus !== "succeeded")
        throw new HttpError(
          409,
          "BOOKING_NOT_PAID",
          "Запрос на отмену доступен после подтверждения оплаты.",
        );
      return updated;
    },
    cancelExpiredBookings: async (
      input: {
        readonly now?: Date;
        readonly limit?: number;
      } = {},
    ) => {
      const now = input.now ?? new Date();
      const groupCandidates =
        typeof repository.findExpiredUnpaidGroups === "function"
          ? await repository.findExpiredUnpaidGroups({
              limit: input.limit ?? EXPIRED_BOOKING_BATCH_SIZE,
              now,
            })
          : [];
      const candidates = await repository.findExpiredUnpaidBookings({
        limit: input.limit ?? EXPIRED_BOOKING_BATCH_SIZE,
        now,
      });
      let cancelled = 0;
      let failed = 0;
      let skipped = 0;

      for (const candidate of groupCandidates) {
        let payment: YooPayment | undefined;
        if (candidate.paymentId) {
          try {
            payment = await yookassa.getPayment(candidate.paymentId);
          } catch {
            skipped += 1;
            continue;
          }
          if (isPaidPayment(payment)) {
            await service.reconcilePayment(payment);
            skipped += 1;
            continue;
          }
        }
        const attemptedAt = new Date();
        const claimed = await repository.claimGroupCancellation({
          attemptedAt,
          groupId: candidate.id,
          now,
        });
        if (!claimed) {
          skipped += 1;
          continue;
        }
        if (candidate.paymentId) {
          try {
            payment = await yookassa.getPayment(candidate.paymentId);
          } catch (error) {
            const failure = cancellationFailure(error);
            await repository.markGroupCancellationFailed({
              attemptedAt,
              errorCode: failure.code,
              errorMessage: failure.message,
              groupId: candidate.id,
            });
            failed += 1;
            continue;
          }
          if (isPaidPayment(payment)) {
            await repository.releaseGroupCancellationForPayment({
              attemptedAt,
              groupId: candidate.id,
            });
            await service.reconcilePayment(payment);
            skipped += 1;
            continue;
          }
        }
        const group = await repository.findGroup(candidate.id);
        if (!group) {
          skipped += 1;
          continue;
        }
        let groupFailure: { code: string; message: string } | null = null;
        if (group.bookings.length === 0) {
          for (const reservationId of reservationIdsFromJson(
            group.reservationIds,
          )) {
            try {
              const cancelled = await cancelReservationBestEffort(
                eptera,
                reservationId,
              );
              if (!cancelled)
                throw new HttpError(
                  502,
                  "EPTERA_CANCELLATION_FAILED",
                  "Не удалось автоматически отменить все созданные брони.",
                );
            } catch (error) {
              groupFailure = cancellationFailure(error);
              break;
            }
          }
        }
        for (const booking of group.bookings) {
          if (groupFailure) break;
          if (booking.cancellationStatus === "succeeded") continue;
          const bookingReference =
            numericEpteraReference(booking.epteraReservationId) ??
            numericEpteraReference(booking.voucherNumber);
          if (!bookingReference) {
            groupFailure = cancellationFailure(
              new HttpError(
                409,
                "EPTERA_BOOKING_REFERENCE_INVALID",
                "Не удалось определить номер бронирования для отмены.",
              ),
            );
            await repository.markBookingCancellationFailed({
              attemptedAt,
              bookingId: booking.id,
              errorCode: groupFailure.code,
              errorMessage: groupFailure.message,
            });
            break;
          }
          try {
            await eptera.cancelReservation(Number(bookingReference));
            await repository.markBookingCancelled({
              attemptedAt,
              bookingId: booking.id,
              cancelledAt: new Date(),
            });
          } catch (error) {
            groupFailure = cancellationFailure(error);
            await repository.markBookingCancellationFailed({
              attemptedAt,
              bookingId: booking.id,
              errorCode: groupFailure.code,
              errorMessage: groupFailure.message,
            });
            break;
          }
        }
        if (groupFailure) {
          await repository.markGroupCancellationFailed({
            attemptedAt,
            errorCode: groupFailure.code,
            errorMessage: groupFailure.message,
            groupId: candidate.id,
          });
          failed += 1;
          continue;
        }
        const result = await repository.markGroupCancelled({
          attemptedAt,
          cancelledAt: new Date(),
          groupId: candidate.id,
        });
        if (result.count === 1) cancelled += 1;
        else skipped += 1;
      }

      for (const candidate of candidates) {
        let payment: YooPayment | undefined;
        if (candidate.paymentId) {
          try {
            payment = await yookassa.getPayment(candidate.paymentId);
          } catch {
            skipped += 1;
            continue;
          }
          if (isPaidPayment(payment)) {
            await service.reconcilePayment(payment);
            skipped += 1;
            continue;
          }
        }

        const attemptedAt = new Date();
        const claimed = await repository.claimBookingCancellation({
          attemptedAt,
          bookingId: candidate.id,
          now,
        });
        if (!claimed) {
          skipped += 1;
          continue;
        }

        if (candidate.paymentId) {
          try {
            payment = await yookassa.getPayment(candidate.paymentId);
          } catch (error) {
            const failure = cancellationFailure(error);
            await repository.markBookingCancellationFailed({
              attemptedAt,
              bookingId: candidate.id,
              errorCode: failure.code,
              errorMessage: failure.message,
            });
            failed += 1;
            continue;
          }
          if (isPaidPayment(payment)) {
            await service.reconcilePayment(payment);
            skipped += 1;
            continue;
          }
        }

        const bookingReference =
          numericEpteraReference(candidate.epteraReservationId) ??
          numericEpteraReference(candidate.voucherNumber);
        if (!bookingReference) {
          const failure = cancellationFailure(
            new HttpError(
              409,
              "EPTERA_BOOKING_REFERENCE_INVALID",
              "Не удалось определить номер бронирования для отмены.",
            ),
          );
          await repository.markBookingCancellationFailed({
            attemptedAt,
            bookingId: candidate.id,
            errorCode: failure.code,
            errorMessage: failure.message,
          });
          failed += 1;
          continue;
        }

        try {
          await eptera.cancelReservation(Number(bookingReference));
        } catch (error) {
          const failure = cancellationFailure(error);
          await repository.markBookingCancellationFailed({
            attemptedAt,
            bookingId: candidate.id,
            errorCode: failure.code,
            errorMessage: failure.message,
          });
          failed += 1;
          continue;
        }

        const result = await repository.markBookingCancelled({
          attemptedAt,
          bookingId: candidate.id,
          cancelledAt: new Date(),
        });
        if (result.count === 1) cancelled += 1;
        else skipped += 1;
      }
      return { cancelled, failed, skipped };
    },
    reconcilePayment: async (payment: YooPayment) => {
      const bookingId = payment.metadata?.bookingId;
      const groupByMetadata =
        bookingId && typeof repository.findGroup === "function"
          ? await repository.findGroup(bookingId)
          : null;
      const group =
        groupByMetadata &&
        (!groupByMetadata.paymentId || groupByMetadata.paymentId === payment.id)
          ? groupByMetadata
          : typeof repository.findGroupByPaymentId === "function"
            ? await repository.findGroupByPaymentId(payment.id)
            : null;
      if (group && (!group.paymentId || group.paymentId === payment.id))
        return reconcileGroupPayment(repository, eptera, group, payment);
      const booking = bookingId
        ? await repository.findBooking(bookingId)
        : await repository.findBookingByPaymentId(payment.id);
      if (!booking || booking.paymentId !== payment.id) return null;
      const paid = isPaidPayment(payment);
      const paymentAmount = Number(payment.amount.value);
      if (!paid) {
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

      const savedPayment = await repository.markYooKassaPaymentSucceeded({
        bookingId: booking.id,
        paymentAmount,
        paymentId: payment.id,
      });
      if (!savedPayment || savedPayment.paymentStatus !== "succeeded")
        return savedPayment;
      if (savedPayment.epteraPaymentSyncStatus === "succeeded")
        return savedPayment;

      const attemptedAt = new Date();
      const claimed = await repository.claimEpteraPaymentSync({
        attemptedAt,
        bookingId: booking.id,
        staleBefore: new Date(
          attemptedAt.getTime() - EPTERA_PAYMENT_SYNC_STALE_AFTER_MS,
        ),
      });
      if (!claimed) return repository.findBooking(booking.id);

      try {
        const bookingReference = numericEpteraReference(
          savedPayment.epteraReservationId,
        );
        if (!bookingReference) {
          throw new HttpError(
            409,
            "EPTERA_BOOKING_REFERENCE_INVALID",
            "Не удалось определить номер бронирования для передачи оплаты.",
          );
        }
        await eptera.addPayment({
          amount: paymentAmount,
          bookingReference,
          currency,
        });
      } catch (error) {
        await repository
          .markEpteraPaymentSyncFailed({
            attemptedAt,
            bookingId: booking.id,
          })
          .catch(() => undefined);
        if (error instanceof HttpError) throw error;
        throw new HttpError(
          502,
          "EPTERA_PAYMENT_SYNC_FAILED",
          "Не удалось передать оплату в Eptera.",
        );
      }

      const syncedAt = new Date();
      const syncResult = await repository.markEpteraPaymentSyncSucceeded({
        attemptedAt,
        bookingId: booking.id,
        syncedAt,
      });
      if (syncResult.count === 0) return repository.findBooking(booking.id);
      return repository.findBooking(booking.id);
    },
    reconcileRefund: async (refund: YooRefund) => {
      const groupByRefundId =
        typeof repository.findGroupByRefundId === "function"
          ? await repository.findGroupByRefundId(refund.id)
          : null;
      const group =
        groupByRefundId ??
        (typeof repository.findGroupByPaymentId === "function"
          ? await repository.findGroupByPaymentId(refund.paymentId)
          : null);
      if (group) {
        if (refund.status === "succeeded") {
          await repository.markGroupRefundSucceeded({
            groupId: group.id,
            refundAmount: refundAmount(refund),
            refundId: refund.id,
            refundedAt: new Date(),
          });
        } else if (refund.status === "canceled" || refund.status === "failed") {
          await repository.markGroupRefundFailed({
            errorCode: `YOOKASSA_REFUND_${refund.status.toUpperCase()}`,
            errorMessage: "Платёжный сервис не подтвердил возврат денег.",
            groupId: group.id,
            refundId: refund.id,
          });
        }
        return repository.findGroup(group.id);
      }

      const bookingByRefundId =
        typeof repository.findBookingByRefundId === "function"
          ? await repository.findBookingByRefundId(refund.id)
          : null;
      const booking =
        bookingByRefundId ??
        (typeof repository.findBookingByPaymentId === "function"
          ? await repository.findBookingByPaymentId(refund.paymentId)
          : null);
      if (!booking) return null;
      if (refund.status === "succeeded") {
        await repository.markBookingRefundSucceeded({
          bookingId: booking.id,
          refundAmount: refundAmount(refund),
          refundId: refund.id,
          refundedAt: new Date(),
        });
      } else if (refund.status === "canceled" || refund.status === "failed") {
        await repository.markBookingRefundFailed({
          bookingId: booking.id,
          errorCode: `YOOKASSA_REFUND_${refund.status.toUpperCase()}`,
          errorMessage: "Платёжный сервис не подтвердил возврат денег.",
          refundId: refund.id,
        });
      }
      return repository.findBooking(booking.id);
    },
  };
  return service;
};

export type BookingService = ReturnType<typeof createBookingService>;
