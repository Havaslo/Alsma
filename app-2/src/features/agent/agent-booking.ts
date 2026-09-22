import { z } from "zod";

import type { CreateReservationBody } from "../booking/booking.schemas.js";
import type { EpteraOffer } from "../booking/eptera.client.js";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const agentBookingSchema = z.object({
  adults: z.number().int().min(1).max(12),
  checkInDate: isoDate,
  checkOutDate: isoDate,
  childAges: z.array(z.number().int().min(0).max(17)).max(8).default([]),
  email: z.string().trim().email().max(320),
  firstName: z.string().trim().min(1).max(80),
  guests: z
    .array(
      z.discriminatedUnion("type", [
        z.object({
          birthDate: isoDate.optional(),
          firstName: z.string().trim().min(1).max(80),
          lastName: z.string().trim().min(1).max(80),
          type: z.literal("adult"),
        }),
        z.object({
          birthDate: isoDate,
          firstName: z.string().trim().min(1).max(80),
          lastName: z.string().trim().min(1).max(80),
          type: z.enum(["child", "baby"]),
        }),
      ]),
    )
    .min(1)
    .max(20)
    .optional(),
  lastName: z.string().trim().min(1).max(80),
  offerId: z.string().trim().min(1).max(300),
  paymentMethod: z.enum(["full", "first_night"]).default("full"),
  phone: z.string().trim().min(7).max(32),
  roomCount: z.number().int().min(1).max(2),
});

export type AgentBooking = z.infer<typeof agentBookingSchema>;

export type AgentOfferSummary = Pick<
  EpteraOffer,
  | "benefits"
  | "boardType"
  | "currency"
  | "discountedPrice"
  | "id"
  | "rateDescription"
  | "rateType"
  | "roomArea"
  | "roomCapacity"
  | "roomDescription"
  | "roomImageUrl"
  | "roomType"
  | "roomToSell"
  | "price"
>;

const isExcludedRoom = (
  offer: Pick<AgentOfferSummary, "rateType" | "roomType" | "roomDescription">,
) =>
  /(?:для\s+групп|группов(?:ой|ого|ые)|(?:^|\s)корпус\s*2\b|(?:^|\s)тест(?:овый|овая|овое)?(?=\s|$|[),.;:]))/iu.test(
    `${offer.roomType} ${offer.rateType} ${offer.roomDescription ?? ""}`,
  );

const offerPrice = (
  offer: Pick<AgentOfferSummary, "discountedPrice" | "price">,
) => (offer.discountedPrice > 0 ? offer.discountedPrice : offer.price);

export const summarizeEpteraOffers = (
  offers: readonly EpteraOffer[],
): AgentOfferSummary[] =>
  normalizeAgentOfferSummaries(
    offers.map((offer) => ({
      benefits: offer.benefits,
      boardType: offer.boardType,
      currency: offer.currency,
      discountedPrice: offer.discountedPrice,
      id: offer.id,
      rateDescription: offer.rateDescription,
      rateType: offer.rateType,
      roomArea: offer.roomArea,
      roomCapacity: offer.roomCapacity,
      roomDescription: offer.roomDescription,
      roomImageUrl: offer.roomImageUrl,
      roomToSell: offer.roomToSell,
      roomType: offer.roomType,
      price: offer.price,
    })),
  );

export const normalizeAgentOfferSummaries = (
  offers: readonly AgentOfferSummary[],
): AgentOfferSummary[] =>
  offers.filter(
    (offer) =>
      Boolean(offer.id.trim() && offer.roomType.trim()) &&
      Number.isFinite(offerPrice(offer)) &&
      offerPrice(offer) > 0 &&
      !isExcludedRoom(offer),
  );

export const formatEpteraOffers = (offers: readonly AgentOfferSummary[]) =>
  offers
    .map((offer, index) => {
      const finalPrice = offerPrice(offer);
      const details = [
        `${index + 1}. ${offer.roomType}`,
        `тариф: ${offer.rateType}`,
        `питание: ${offer.boardType}`,
        `цена: ${finalPrice} ${offer.currency}`,
        offer.roomArea ? `площадь: ${offer.roomArea} м²` : "",
        offer.roomCapacity ? `вместимость: ${offer.roomCapacity}` : "",
        offer.roomToSell !== null
          ? `доступно номеров: ${offer.roomToSell}`
          : "",
        offer.rateDescription ?? "",
        offer.roomDescription ?? "",
        offer.benefits.length ? `включено: ${offer.benefits.join(", ")}` : "",
      ].filter(Boolean);
      return `${details.join("; ")} [offerId=${offer.id}]`;
    })
    .join("\n");

const nightsBetween = (checkIn?: string, checkOut?: string) => {
  if (!checkIn || !checkOut) return 1;
  const start = new Date(`${checkIn}T00:00:00.000Z`).getTime();
  const end = new Date(`${checkOut}T00:00:00.000Z`).getTime();
  const nights = Math.round((end - start) / 86_400_000);
  return Number.isFinite(nights) && nights > 0 ? nights : 1;
};

const formatPrice = (value: number, currency: string) => {
  const amount = new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(value);
  return `${amount} ${currency === "RUB" ? "₽" : currency}`;
};

export const selectPrimaryEpteraOffers = (
  offers: readonly AgentOfferSummary[],
) => {
  const source = normalizeAgentOfferSummaries(offers);
  const unique = new Map<string, AgentOfferSummary>();
  for (const offer of source) {
    const key = offer.roomType.trim().toLocaleLowerCase("ru-RU");
    const current = unique.get(key);
    const currentPrice = current
      ? offerPrice(current)
      : Number.POSITIVE_INFINITY;
    if (!current || offerPrice(offer) < currentPrice) unique.set(key, offer);
  }
  return [...unique.values()];
};

export const formatEpteraOffersForAgent = (
  offers: readonly AgentOfferSummary[],
  detailed: boolean,
) => {
  const source = detailed
    ? normalizeAgentOfferSummaries(offers)
    : selectPrimaryEpteraOffers(offers);
  return source
    .map((offer) => {
      const details = [
        `Название: ${offer.roomType}`,
        `Вместимость: до ${offer.roomCapacity ?? "не указана"} гостей`,
        `Площадь: ${offer.roomArea ? `${offer.roomArea} м²` : "не указана"}`,
        `Цена за период: ${formatPrice(offerPrice(offer), offer.currency)}`,
        ...(detailed
          ? [
              `Тариф: ${offer.rateType}`,
              `Питание: ${offer.boardType}`,
              `offerId: ${offer.id}`,
            ]
          : [`offerId: ${offer.id}`]),
      ];
      return details.join("; ");
    })
    .join("\n");
};

export const formatEpteraOffersForGuest = (
  offers: readonly AgentOfferSummary[],
  checkIn?: string,
  checkOut?: string,
) => {
  const nights = nightsBetween(checkIn, checkOut);
  return selectPrimaryEpteraOffers(offers)
    .map((offer) => {
      const totalPrice = offerPrice(offer);
      const pricePerNight = totalPrice / nights;
      return [
        `**${offer.roomType.trim()}**`,
        `Вместимость: до ${offer.roomCapacity ?? "не указана"} гостей`,
        `Площадь: ${offer.roomArea ? `${offer.roomArea} м²` : "не указана"}`,
        `Цена за ночь: ${formatPrice(pricePerNight, offer.currency)}`,
      ].join("\n");
    })
    .join("\n\n");
};

export const isExplicitBookingConfirmation = (message: string) =>
  /(?:подтверждаю|подтвердить|подтверди|брониру(?:йте|й)|заброниру(?:йте|й)|оформля(?:йте|й)|оформите|созда(?:й|вай|йте|ть)|бер[её]м|соглас(?:ен|на)|да[,.!\s]+(?:брониру|заброниру|оформ|созда|бер[её]м))/iu.test(
    message,
  ) || /^(?:да|точно|верно)[\s.!?]*$/iu.test(message.trim());

const defaultAdultGuest = (booking: AgentBooking) => ({
  firstName: booking.firstName,
  lastName: booking.lastName,
  type: "adult" as const,
});

export const toReservationBody = (
  booking: AgentBooking,
  returnUrl: string,
): CreateReservationBody => ({
  adults: booking.adults,
  checkIn: booking.checkInDate,
  checkOut: booking.checkOutDate,
  childAges: booking.childAges,
  contact: {
    email: booking.email,
    firstName: booking.firstName,
    lastName: booking.lastName,
    phone: booking.phone,
  },
  currency: "RUB",
  guests: booking.guests ?? [defaultAdultGuest(booking)],
  nationality: "RU",
  offerId: booking.offerId,
  paymentMethod: booking.paymentMethod,
  returnUrl,
  roomCount: booking.roomCount,
});
