import { z } from "zod";

const isRealIsoDate = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
};

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(isRealIsoDate, "Введите существующую дату.");

export const offersQuerySchema = z.object({
  adults: z.coerce.number().int().min(1).max(12).default(1),
  checkIn: isoDate,
  checkOut: isoDate,
  childAges: z
    .string()
    .optional()
    .transform((value) =>
      value ? value.split(",").map((age) => Number(age.trim())) : [],
    )
    .pipe(z.array(z.number().int().min(0).max(17)).max(8)),
  currency: z.string().trim().length(3).default("RUB"),
  language: z.string().trim().length(2).default("ru"),
  nationality: z.string().trim().length(2).default("RU"),
  roomCount: z.coerce.number().int().min(1).max(2).default(1),
});

export const calendarPricesQuerySchema = z.object({
  adults: z.coerce.number().int().min(1).max(12).default(1),
  childAges: z
    .string()
    .optional()
    .transform((value) =>
      value ? value.split(",").map((age) => Number(age.trim())) : [],
    )
    .pipe(z.array(z.number().int().min(0).max(17)).max(8)),
  currency: z.string().trim().length(3).default("RUB"),
  language: z.string().trim().length(2).default("ru"),
  month: z.string().regex(/^\d{4}-(?:0[1-9]|1[0-2])$/),
  nationality: z.string().trim().length(2).default("RU"),
  roomCount: z.coerce.number().int().min(1).max(2).default(1),
});

const adultGuestSchema = z.object({
  birthDate: isoDate.optional(),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  type: z.literal("adult"),
});

const childGuestSchema = z.object({
  birthDate: isoDate,
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  type: z.enum(["child", "baby"]),
});

const guestSchema = z.discriminatedUnion("type", [
  adultGuestSchema,
  childGuestSchema,
]);

export const createReservationBodySchema = z.object({
  adults: z.number().int().min(1).max(12),
  checkIn: isoDate,
  checkOut: isoDate,
  childAges: z.array(z.number().int().min(0).max(17)).max(8).default([]),
  contact: z.object({
    email: z.string().trim().email().max(320),
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
    phone: z.string().trim().min(7).max(32),
  }),
  currency: z.string().trim().length(3).default("RUB"),
  guests: z.array(guestSchema).min(1).max(20),
  nationality: z.string().trim().length(2).default("RU"),
  notes: z.string().trim().max(1000).optional(),
  offerId: z.string().trim().min(1).max(300),
  paymentMethod: z.enum(["full", "first_night"]).default("full"),
  returnUrl: z.string().url().max(2000),
  roomCount: z.number().int().min(1).max(2).default(1),
});

export type CalendarPricesQuery = z.infer<typeof calendarPricesQuerySchema>;
export type CreateReservationBody = z.infer<typeof createReservationBodySchema>;
export type OffersQuery = z.infer<typeof offersQuerySchema>;
