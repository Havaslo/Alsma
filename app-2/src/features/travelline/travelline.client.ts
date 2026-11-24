import { z } from "zod";

import { HttpError } from "../../lib/http/http-error.js";

const API_ORIGIN = "https://partner.tlintegration.com";
const idSchema = z.string().regex(/^[A-Za-z0-9_-]{1,100}$/u);
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/u)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return (
      Number.isFinite(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    );
  });
export const travelLineSearchSchema = z
  .object({
    checkIn: isoDate,
    checkOut: isoDate,
    adults: z.number().int().min(1).max(12),
    childAges: z.array(z.number().int().min(0).max(17)).max(8).default([]),
  })
  .refine(
    (input) => input.checkOut > input.checkIn,
    "Дата выезда должна быть позже даты заезда.",
  );

const roomSchema = z
  .object({
    id: idSchema,
    name: z.string(),
    description: z.string().nullish(),
    images: z
      .array(z.object({ url: z.string().url() }).passthrough())
      .nullish(),
  })
  .passthrough();
const propertySchema = z
  .object({
    id: idSchema,
    name: z.string(),
    roomTypes: z.array(roomSchema),
    ratePlans: z.array(
      z.object({ id: idSchema, name: z.string() }).passthrough(),
    ),
  })
  .passthrough();
const staySchema = z
  .object({
    propertyId: idSchema,
    roomType: z.object({ id: idSchema }).passthrough(),
    ratePlan: z.object({ id: idSchema }).passthrough(),
    guestCount: z.object({
      adultCount: z.number().int(),
      childAges: z.array(z.number().int()).nullish(),
    }),
    stayDates: z.object({
      arrivalDateTime: z.string(),
      departureDateTime: z.string(),
    }),
    availability: z.number().int().nonnegative(),
    currencyCode: z.string().length(3),
    total: z
      .object({
        priceBeforeTax: z.number().finite().nonnegative(),
        taxAmount: z.number().finite().nonnegative(),
      })
      .passthrough(),
    cancellationPolicy: z.unknown(),
    mealPlanCode: z.string().nullish(),
    bookingFormLink: z.string().nullish(),
  })
  .passthrough();
const searchSchema = z.object({
  roomStays: z.array(staySchema),
  warnings: z.array(z.object({ code: z.string() }).passthrough()).nullish(),
});
const summariesSchema = z.object({
  continueToken: z.string().nullish(),
  hasMoreData: z.boolean(),
  bookingSummaries: z.array(
    z
      .object({
        number: z.string().min(1).max(100),
        propertyId: z.union([z.string(), z.number()]),
        status: z.string(),
        modifiedDateTime: z.string(),
      })
      .passthrough(),
  ),
});
const bookingSchema = z.object({
  booking: z
    .object({
      propertyId: z.union([z.string(), z.number()]),
      number: z.string(),
      status: z.string(),
    })
    .passthrough(),
});

export type TravelLineOptions = {
  clientId: string;
  clientSecret: string;
  propertyId: string;
  fetcher?: typeof fetch;
  now?: () => number;
};

// This client deliberately exposes no create/cancel/payment methods: the
// approved TravelLine integration performs checkout in TL: Booking Engine.
export const createTravelLineClient = (options: TravelLineOptions) => {
  const propertyId = idSchema.parse(options.propertyId);
  const fetcher = options.fetcher ?? fetch;
  const now = options.now ?? Date.now;
  let session: { token: string; expiresAt: number } | undefined;
  let authenticating: Promise<string> | undefined;
  let content:
    { value: z.infer<typeof propertySchema>; expiresAt: number } | undefined;
  let loadingContent: Promise<z.infer<typeof propertySchema>> | undefined;
  const failure = (code: string, status = 502) =>
    new HttpError(
      status,
      code,
      "Не удалось получить данные TravelLine. Попробуйте позже.",
    );
  const getToken = async (): Promise<string> => {
    if (session && session.expiresAt > now()) return session.token;
    if (authenticating) return authenticating;
    authenticating = (async () => {
      let response: Response;
      try {
        response = await fetcher(`${API_ORIGIN}/auth/token`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "client_credentials",
            client_id: options.clientId,
            client_secret: options.clientSecret,
          }),
          redirect: "error",
          signal: AbortSignal.timeout(15_000),
        });
      } catch {
        throw failure("TRAVELLINE_AUTH_UNAVAILABLE");
      }
      if (!response.ok) throw failure("TRAVELLINE_AUTH_DENIED");
      const parsed = z
        .object({
          access_token: z.string().min(1),
          expires_in: z.number().positive(),
        })
        .safeParse(await response.json().catch(() => null));
      if (!parsed.success) throw failure("TRAVELLINE_AUTH_RESPONSE_INVALID");
      session = {
        token: parsed.data.access_token,
        expiresAt: now() + Math.max(1, parsed.data.expires_in - 30) * 1000,
      };
      return session.token;
    })();
    try {
      return await authenticating;
    } finally {
      authenticating = undefined;
    }
  };
  const request = async <T>(
    path: string,
    schema: z.ZodType<T>,
    replay = true,
  ): Promise<T> => {
    const token = await getToken();
    let response: Response;
    try {
      response = await fetcher(`${API_ORIGIN}/api/${path}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        redirect: "error",
        signal: AbortSignal.timeout(20_000),
      });
    } catch {
      throw failure("TRAVELLINE_UNAVAILABLE");
    }
    if (response.status === 401 && replay) {
      if (session?.token === token) session = undefined;
      return request(path, schema, false);
    }
    if (!response.ok)
      throw failure(
        `TRAVELLINE_HTTP_${response.status}`,
        response.status === 429 ? 503 : 502,
      );
    const result = schema.safeParse(await response.json().catch(() => null));
    if (!result.success) throw failure("TRAVELLINE_RESPONSE_INVALID");
    return result.data;
  };
  const getProperty = async () => {
    if (content && content.expiresAt > now()) return content.value;
    if (loadingContent) return loadingContent;
    loadingContent = request(
      `content/v1/properties/${propertyId}`,
      propertySchema,
    ).then((value) => {
      if (value.id !== propertyId)
        throw failure("TRAVELLINE_PROPERTY_MISMATCH");
      content = { value, expiresAt: now() + 60 * 60_000 };
      return value;
    });
    try {
      return await loadingContent;
    } finally {
      loadingContent = undefined;
    }
  };
  return {
    propertyId,
    getProperty,
    search: async (input: z.input<typeof travelLineSearchSchema>) => {
      const criteria = travelLineSearchSchema.parse(input);
      const query = new URLSearchParams({
        arrivalDate: criteria.checkIn,
        departureDate: criteria.checkOut,
        adults: String(criteria.adults),
      });
      criteria.childAges.forEach((age) =>
        query.append("childAges", String(age)),
      );
      const result = await request(
        `search/v1/properties/${propertyId}/room-stays?${query}`,
        searchSchema,
      );
      // A rights warning is not an empty, successful availability result.
      if (result.warnings?.length) throw failure("TRAVELLINE_SEARCH_WARNING");
      for (const stay of result.roomStays) {
        if (
          stay.propertyId !== propertyId ||
          stay.guestCount.adultCount !== criteria.adults ||
          JSON.stringify(
            [...(stay.guestCount.childAges ?? [])].sort((a, b) => a - b),
          ) !== JSON.stringify([...criteria.childAges].sort((a, b) => a - b)) ||
          stay.stayDates.arrivalDateTime.slice(0, 10) !== criteria.checkIn ||
          stay.stayDates.departureDateTime.slice(0, 10) !== criteria.checkOut
        ) {
          throw failure("TRAVELLINE_SEARCH_MISMATCH");
        }
      }
      return result;
    },
    listBookings: async (
      input: {
        continueToken?: string;
        lastModification?: string;
        count?: number;
      } = {},
    ) => {
      const parsed = z
        .object({
          continueToken: z.string().min(1).max(10_000).optional(),
          lastModification: z.iso.datetime().optional(),
          count: z.number().int().min(1).max(1000).default(100),
        })
        .refine((x) => !(x.continueToken && x.lastModification))
        .parse(input);
      const query = new URLSearchParams({ count: String(parsed.count) });
      if (parsed.continueToken)
        query.set("continueToken", parsed.continueToken);
      if (parsed.lastModification)
        query.set("lastModification", parsed.lastModification);
      const result = await request(
        `read-reservation/v1/properties/${propertyId}/bookings?${query}`,
        summariesSchema,
      );
      if (
        result.bookingSummaries.some((x) => String(x.propertyId) !== propertyId)
      )
        throw failure("TRAVELLINE_PROPERTY_MISMATCH");
      return result;
    },
    getBooking: async (number: string) => {
      const bookingNumber = z
        .string()
        .regex(/^[A-Za-z0-9_-]{1,100}$/u)
        .parse(number);
      const result = await request(
        `read-reservation/v1/properties/${propertyId}/bookings/${encodeURIComponent(bookingNumber)}`,
        bookingSchema,
      );
      if (
        String(result.booking.propertyId) !== propertyId ||
        result.booking.number !== number
      )
        throw failure("TRAVELLINE_BOOKING_MISMATCH");
      return result.booking;
    },
  };
};

export type TravelLineClient = ReturnType<typeof createTravelLineClient>;
