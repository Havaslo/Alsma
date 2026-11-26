import { createHash } from "node:crypto";
import { z } from "zod";

import { HttpError } from "../../lib/http/http-error.js";
import type { EpteraOffer } from "../booking/eptera.client.js";
import {
  type TravelLineClient,
  type TravelLineOptions,
  createTravelLineClient,
  travelLineSearchSchema,
} from "./travelline.client.js";

export type TravelLineConfiguration = {
  enabled: boolean;
  clientId?: string;
  clientSecret?: string;
  propertyId?: string;
  bookingUrl?: string;
  webhookSecret?: string;
};

const mealNames: Record<string, string> = {
  AllInclusive: "Всё включено",
  UltraAllInclusive: "Ультра всё включено",
  BuffetBreakfast: "Завтрак — шведский стол",
  ContinentalBreakfast: "Континентальный завтрак",
  EnglishBreakfast: "Английский завтрак",
  AmericanBreakfast: "Американский завтрак",
  BreakFast: "Завтрак",
  FullBoard: "Полный пансион",
  FullBoardBuffet: "Полный пансион — шведский стол",
  FullBoardCarte: "Полный пансион — по меню",
  HalfBoard: "Полупансион",
  HalfBoardLunch: "Завтрак и обед",
  HalfBoardDinner: "Завтрак и ужин",
  HalfBoardLunchDinner: "Обед и ужин",
  Lunch: "Обед",
  Dinner: "Ужин",
  BuffetDinner: "Ужин — шведский стол",
  DinnerCarte: "Ужин — по меню",
};

export const travelLineBookingUrl = (
  base: string,
  input?: {
    checkIn?: string;
    checkOut?: string;
    adults?: number;
    childAges?: readonly number[];
  },
) => {
  const url = new URL(base);
  if (url.protocol !== "https:" || url.username || url.password)
    throw new Error("TravelLine booking URL must be HTTPS without credentials");
  if (input)
    travelLineSearchSchema.parse({
      ...input,
      childAges: [...(input.childAges ?? [])],
    });
  const hostedForm =
    url.hostname === "b.tlintegration.com" && url.pathname === "/metasearch/";
  const parameter = (name: string) => (hostedForm ? `tl-${name}` : name);
  if (input?.checkIn) url.searchParams.set(parameter("date"), input.checkIn);
  if (input?.checkIn && input.checkOut)
    url.searchParams.set(
      parameter("nights"),
      String(
        Math.round(
          (Date.parse(input.checkOut) - Date.parse(input.checkIn)) / 86_400_000,
        ),
      ),
    );
  if (input?.adults)
    url.searchParams.set(parameter("adults"), String(input.adults));
  if (input) {
    if (!hostedForm)
      url.searchParams.set("children", String(input.childAges?.length ?? 0));
    if (input.childAges?.length)
      url.searchParams.set(
        parameter("children-age"),
        input.childAges.join(","),
      );
    else url.searchParams.delete(parameter("children-age"));
  }
  return url.toString();
};

export const createTravelLineService = (
  configuration: TravelLineConfiguration,
  clientOverride?: TravelLineClient,
) => {
  if (
    configuration.enabled &&
    (!configuration.clientId ||
      !configuration.clientSecret ||
      !configuration.propertyId)
  )
    throw new Error("TravelLine credentials are missing");
  const client =
    clientOverride ??
    (configuration.enabled
      ? createTravelLineClient(configuration as TravelLineOptions)
      : undefined);
  const configuredBookingUrl = configuration.bookingUrl
    ? travelLineBookingUrl(configuration.bookingUrl)
    : undefined;
  const requireClient = () => {
    if (!client || !configuration.enabled)
      throw new HttpError(
        503,
        "TRAVELLINE_DISABLED",
        "Бронирование временно недоступно.",
      );
    return client;
  };
  return {
    enabled: configuration.enabled,
    client,
    configuration,
    checkoutUrl: (input?: {
      checkIn?: string;
      checkOut?: string;
      adults?: number;
      childAges?: readonly number[];
    }) => {
      if (!configuredBookingUrl)
        throw new HttpError(
          503,
          "TRAVELLINE_MODULE_NOT_CONFIGURED",
          "Онлайн-бронирование готовится к запуску. Обратитесь в отдел бронирования.",
        );
      return travelLineBookingUrl(configuredBookingUrl, input);
    },
    getOffers: async (input: {
      checkIn: string;
      checkOut: string;
      adults: number;
      childAges?: readonly number[];
      roomCount?: number;
    }): Promise<EpteraOffer[]> => {
      // Search API returns a single-room placement. Never present it as a
      // verified multi-room booking by splitting total guests arbitrarily.
      if ((input.roomCount ?? 1) !== 1)
        throw new HttpError(
          409,
          "TRAVELLINE_MULTIROOM_CHECKOUT_REQUIRED",
          "Подбор нескольких номеров доступен в форме бронирования TravelLine.",
        );
      const provider = requireClient();
      const criteria = { ...input, childAges: [...(input.childAges ?? [])] };
      const [property, result] = await Promise.all([
        provider.getProperty(),
        provider.search(criteria),
      ]);
      return result.roomStays
        .filter((stay) => stay.availability > 0)
        .map((stay) => {
          const room = property.roomTypes.find(
            (x) => x.id === stay.roomType.id,
          );
          const rate = property.ratePlans.find(
            (x) => x.id === stay.ratePlan.id,
          );
          if (!room || !rate)
            throw new HttpError(
              502,
              "TRAVELLINE_CONTENT_MISMATCH",
              "Описание предложения временно недоступно.",
            );
          const images = (room.images ?? [])
            .map((x) => x.url)
            .filter((x) => new URL(x).protocol === "https:");
          const price = stay.total.priceBeforeTax;
          return {
            verifiedPlacement: {
              adults: stay.guestCount.adultCount,
              childAges: [...(stay.guestCount.childAges ?? [])],
              roomCount: 1,
            },
            id: `tl:${createHash("sha256")
              .update(
                JSON.stringify([
                  provider.propertyId,
                  criteria,
                  stay.roomType.id,
                  stay.ratePlan.id,
                  stay.guestCount,
                ]),
              )
              .digest("hex")}`,
            hotelId: Number(provider.propertyId),
            marketId: null,
            roomTypeId: Number(room.id),
            roomType: room.name,
            boardTypeId: 0,
            boardType:
              mealNames[stay.mealPlanCode ?? ""] ??
              "Питание уточняется в форме бронирования",
            rateTypeId: Number(rate.id),
            rateType: rate.name,
            rateCodeId: 0,
            priceAgencyId: 0,
            roomId: null,
            currency: stay.currencyCode,
            price,
            discountedPrice: price,
            roomToSell: stay.availability,
            cancellationPenalty: stay.cancellationPolicy,
            rateDescription:
              typeof rate.description === "string"
                ? rate.description.replace(/<[^>]*>/gu, " ")
                : null,
            benefits:
              stay.total.taxAmount > 0
                ? [
                    `Налоги и сборы при заезде: ${stay.total.taxAmount} ${stay.currencyCode}`,
                  ]
                : [],
            roomImageUrl: images[0] ?? null,
            roomImageUrls: images,
            roomArea: null,
            roomCount: null,
            roomCapacity: null,
            roomDescription:
              room.description?.replace(/<[^>]*>/gu, " ") ?? null,
            bedOptions: null,
          };
        });
    },
  };
};

export type TravelLineService = ReturnType<typeof createTravelLineService>;

const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T/u)
  .refine((x) => {
    const parsed = new Date(`${x.slice(0, 10)}T00:00:00Z`);
    return (
      Number.isFinite(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === x.slice(0, 10)
    );
  })
  .transform((x) => new Date(`${x.slice(0, 10)}T00:00:00Z`))
  .refine((x) => Number.isFinite(x.getTime()));
export const travelLineBookingSnapshot = (raw: unknown) => {
  const booking = z
    .object({
      propertyId: z.union([z.string(), z.number()]),
      number: z.string(),
      modifiedDateTime: z.iso.datetime(),
      status: z.string(),
      currencyCode: z.string().length(3),
      guaranteeInfo: z
        .object({ totalPrepaid: z.number().nonnegative() })
        .nullish(),
      total: z.object({ priceAfterTax: z.number().nonnegative() }),
      roomStays: z
        .array(
          z.object({
            stayDates: z.object({
              arrivalDateTime: date,
              departureDateTime: date,
            }),
            roomType: z.object({ name: z.string() }),
            guestCount: z.object({
              adultCount: z.number().int().nonnegative(),
              childAges: z.array(z.number()).nullish(),
            }),
          }),
        )
        .min(1),
    })
    .parse(raw);
  const arrivals = booking.roomStays.map((x) =>
    x.stayDates.arrivalDateTime.getTime(),
  );
  const departures = booking.roomStays.map((x) =>
    x.stayDates.departureDateTime.getTime(),
  );
  const total = booking.total.priceAfterTax;
  const prepaid = booking.guaranteeInfo?.totalPrepaid ?? 0;
  return {
    roomName: booking.roomStays.map((x) => x.roomType.name).join(", "),
    checkInDate: new Date(Math.min(...arrivals)),
    checkOutDate: new Date(Math.max(...departures)),
    guestsCount: booking.roomStays.reduce(
      (n, x) =>
        n + x.guestCount.adultCount + (x.guestCount.childAges?.length ?? 0),
      0,
    ),
    status:
      booking.status === "Cancelled"
        ? "cancelled"
        : booking.status === "Active"
          ? "reserved"
          : "provider_status_unknown",
    currency: booking.currencyCode,
    totalAmount: total,
    paymentAmount: prepaid,
    paymentStatus:
      prepaid >= total && total > 0
        ? "succeeded"
        : prepaid > 0
          ? "partially_paid"
          : "payment_pending",
    voucherNumber: booking.number,
    provider: "travelline",
    providerPropertyId: String(booking.propertyId),
    providerBookingId: booking.number,
    providerSyncedAt: new Date(),
    providerModifiedAt: new Date(booking.modifiedDateTime),
    ...(booking.status === "Cancelled"
      ? { cancellationStatus: "succeeded", cancelledAt: new Date() }
      : {}),
  };
};
