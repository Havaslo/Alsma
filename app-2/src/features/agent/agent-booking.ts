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

export const summarizeEpteraOffers = (
  offers: readonly EpteraOffer[],
): AgentOfferSummary[] =>
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
  }));

export const formatEpteraOffers = (offers: readonly AgentOfferSummary[]) =>
  offers
    .map((offer, index) => {
      const finalPrice =
        offer.discountedPrice > 0 ? offer.discountedPrice : offer.price;
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

export const formatEpteraOffersForGuest = (
  offers: readonly AgentOfferSummary[],
) => formatEpteraOffers(offers).replace(/\s*\[offerId=[^\]]+\]/gu, "");

export const isExplicitBookingConfirmation = (message: string) =>
  /(?:подтверждаю|подтвердить|брониру(?:йте|й)|оформля(?:йте|й)|оформите|бер[её]м|соглас(?:ен|на)|да[,.!\s]+(?:брониру|оформ|бер[её]м))/iu.test(
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
