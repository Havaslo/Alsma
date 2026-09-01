import { HttpError } from "../../lib/http/http-error.js";
import { type RoomDefinition, readDefinitions } from "./eptera.rooms.js";

const EPTERA_BASE_URL = "https://bookingapi.eptera.ru";
const REQUEST_TIMEOUT_MS = 15_000;
const TOKEN_REFRESH_MARGIN_MS = 60_000;
const MAX_TRANSIENT_RETRIES = 2;

type EpteraClientOptions = {
  readonly apiKey?: string;
  readonly hotelId?: string;
};

type Session = {
  readonly expiresAt: number | null;
  readonly token: string;
};

export type EpteraOffer = {
  readonly id: string;
  readonly hotelId: number;
  readonly roomTypeId: number;
  readonly roomType: string;
  readonly boardTypeId: number;
  readonly boardType: string;
  readonly rateTypeId: number;
  readonly rateType: string;
  readonly rateCodeId: number;
  readonly priceAgencyId: number;
  readonly currency: string;
  readonly price: number;
  readonly discountedPrice: number;
  readonly roomToSell: number | null;
  readonly cancellationPenalty: unknown;
  readonly rateDescription: string | null;
  readonly benefits: readonly string[];
  readonly roomImageUrl: string | null;
  readonly roomImageUrls: readonly string[];
  readonly roomArea: number | null;
  readonly roomCount: number | null;
  readonly roomCapacity: number | null;
  readonly roomDescription: string | null;
  readonly bedOptions: string | null;
};

export type AvailabilityRequest = {
  readonly adults: number;
  readonly checkIn: string;
  readonly checkOut: string;
  readonly children: readonly number[];
  readonly roomCount: number;
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
const string = (record: Record<string, unknown>, key: string): string =>
  typeof record[key] === "string" ? record[key] : "";
const number = (record: Record<string, unknown>, key: string): number =>
  typeof record[key] === "number" ? record[key] : Number(record[key]);
const nullableNumber = (
  record: Record<string, unknown>,
  key: string,
): number | null => {
  const value = record[key];
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const readOfferItems = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) return payload;
  const response = asRecord(payload);
  if (!response) return [];
  for (const key of ["data", "offers", "prices", "items"]) {
    if (Array.isArray(response[key])) return response[key];
  }
  return [];
};

const readJwt = (payload: unknown): string => {
  const response = asRecord(payload);
  return response && typeof response.jwt === "string"
    ? response.jwt.trim()
    : "";
};

const readAllowedHotelIds = (payload: unknown): number[] => {
  const response = asRecord(payload);
  const values = response?.["allowed-hotel-ids"];
  if (!Array.isArray(values)) return [];
  return values.flatMap((value) => {
    const id = typeof value === "number" ? value : Number(value);
    return Number.isInteger(id) && id > 0 ? [id] : [];
  });
};

const readTokenExpiry = (token: string): number | null => {
  try {
    const encodedPayload = token.split(".")[1];
    if (!encodedPayload) return null;
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as { exp?: unknown };
    return typeof payload.exp === "number" && payload.exp > 0
      ? payload.exp * 1000
      : null;
  } catch {
    return null;
  }
};

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

const addDays = (value: string, days: number): string => {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
};

export const createEpteraClient = ({
  apiKey,
  hotelId,
}: EpteraClientOptions) => {
  let session: Session | undefined;
  let loginPromise: Promise<Session> | undefined;
  let definitions:
    { expiresAt: number; rooms: Map<number, RoomDefinition> } | undefined;

  const requireConfiguration = (): { apiKey: string; hotelId: string } => {
    const normalizedApiKey = apiKey?.trim();
    const normalizedHotelId = hotelId?.trim();
    if (
      !normalizedApiKey ||
      !normalizedHotelId ||
      !/^\d+$/.test(normalizedHotelId) ||
      Number(normalizedHotelId) < 1
    ) {
      throw new HttpError(
        503,
        "EPTERA_NOT_CONFIGURED",
        "Сервис бронирования временно недоступен.",
      );
    }
    return { apiKey: normalizedApiKey, hotelId: normalizedHotelId };
  };

  const login = async (): Promise<Session> => {
    if (loginPromise) return loginPromise;
    loginPromise = (async () => {
      const config = requireConfiguration();
      let response: Response;
      try {
        response = await fetch(`${EPTERA_BASE_URL}/login`, {
          body: JSON.stringify({}),
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            "Content-Type": "application/json",
          },
          method: "POST",
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
      } catch {
        throw new HttpError(
          502,
          "EPTERA_UNAVAILABLE",
          "Не удалось связаться с сервисом бронирования.",
        );
      } finally {
        loginPromise = undefined;
      }
      const payload: unknown = await response.json().catch(() => null);
      const token = readJwt(payload);
      const hotelNumber = Number(config.hotelId);
      const responseRecord = asRecord(payload);
      const success = responseRecord?.success === true;
      if (
        !response.ok ||
        !success ||
        !token ||
        !readAllowedHotelIds(payload).includes(hotelNumber)
      ) {
        throw new HttpError(
          response.status >= 500 ? 502 : 503,
          "EPTERA_AUTH_FAILED",
          "Eptera не выдала доступ к настроенному отелю. Проверьте интеграцию Eptera.",
          { status: response.status },
        );
      }
      const nextSession = {
        expiresAt: readTokenExpiry(token),
        token,
      } satisfies Session;
      session = nextSession;
      return nextSession;
    })();
    return loginPromise;
  };

  const getSession = async (): Promise<Session> => {
    if (
      session &&
      (session.expiresAt === null ||
        session.expiresAt - Date.now() > TOKEN_REFRESH_MARGIN_MS)
    ) {
      return session;
    }
    session = undefined;
    return login();
  };

  const request = async <T>(
    path: string,
    init?: RequestInit,
    retryAuth = true,
    transientRetry = 0,
  ): Promise<T> => {
    const { token } = await getSession();
    let response: Response;
    try {
      response = await fetch(`${EPTERA_BASE_URL}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...init?.headers,
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch {
      if (transientRetry < MAX_TRANSIENT_RETRIES) {
        await wait(250 * 2 ** transientRetry);
        return request(path, init, retryAuth, transientRetry + 1);
      }
      throw new HttpError(
        502,
        "EPTERA_UNAVAILABLE",
        "Не удалось связаться с сервисом бронирования.",
      );
    }
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      if ((response.status === 401 || response.status === 498) && retryAuth) {
        session = undefined;
        return request(path, init, false, transientRetry);
      }
      if (
        (response.status === 429 || response.status >= 500) &&
        transientRetry < MAX_TRANSIENT_RETRIES
      ) {
        const retryAfter = Number(response.headers.get("retry-after"));
        const delay = Number.isFinite(retryAfter)
          ? Math.min(Math.max(retryAfter * 1000, 250), 2_000)
          : 250 * 2 ** transientRetry;
        await wait(delay);
        return request(path, init, retryAuth, transientRetry + 1);
      }
      if (response.status === 401 || response.status === 498) {
        throw new HttpError(
          503,
          "EPTERA_AUTH_FAILED",
          "Eptera отклонила токен доступа. Проверьте интеграцию Eptera.",
          { status: response.status },
        );
      }
      throw new HttpError(
        response.status >= 500 ? 502 : 400,
        "EPTERA_REQUEST_FAILED",
        "Сервис бронирования не смог обработать запрос.",
        { status: response.status },
      );
    }
    return payload as T;
  };

  const getDefinitions = async (): Promise<Map<number, RoomDefinition>> => {
    if (definitions && definitions.expiresAt > Date.now())
      return definitions.rooms;
    const { hotelId: configuredHotelId } = requireConfiguration();
    const query = new URLSearchParams({ language: "ru" });
    try {
      const payload = await request<unknown>(
        `/hotel/${configuredHotelId}/hotel-definitions?${query}`,
      );
      const rooms = readDefinitions(payload);
      definitions = { expiresAt: Date.now() + 5 * 60_000, rooms };
      return rooms;
    } catch {
      return new Map();
    }
  };

  return {
    checkAvailability: async (input: AvailabilityRequest) => {
      const offers = await (async () => {
        const result = await (async () => {
          const rooms = await getDefinitions();
          const { hotelId: configuredHotelId } = requireConfiguration();
          const query = new URLSearchParams({
            adult: String(input.adults),
            childage: input.children.join(","),
            currency: "RUB",
            fromdate: input.checkIn,
            language: "ru",
            "min-room-count": String(input.roomCount),
            nationality: "RU",
            "promo-code": "",
            onlybestoffer: "false",
            todate: input.checkOut,
          });
          const payload = await request<unknown>(
            `/hotel/${configuredHotelId}/price/?${query}`,
          );
          return readOfferItems(payload).flatMap((item) => {
            const offer = asRecord(item);
            if (!offer) return [];
            const id = string(offer, "id");
            if (!id) return [];
            const room = rooms.get(number(offer, "room-type-id"));
            const roomToSell = nullableNumber(offer, "room-tosell");
            const capacity = room?.capacity ?? null;
            if (
              roomToSell === 0 ||
              (capacity !== null &&
                capacity < input.adults + input.children.length)
            )
              return [];
            return [
              {
                id,
                roomType: string(offer, "room-type"),
                roomToSell,
                capacity,
                price:
                  nullableNumber(offer, "discounted-price") ??
                  nullableNumber(offer, "price"),
                currency: string(offer, "currency") || "RUB",
              },
            ];
          });
        })();
        return result;
      })();
      return { available: offers.length > 0, offers: offers.slice(0, 5) };
    },
    getOffers: async (input: {
      adults: number;
      checkIn: string;
      checkOut: string;
      childAges: number[];
      currency: string;
      language: string;
      nationality: string;
      roomCount: number;
    }): Promise<EpteraOffer[]> => {
      const rooms = await getDefinitions();
      const { hotelId: configuredHotelId } = requireConfiguration();
      const pricePath = (checkIn: string, checkOut: string) => {
        const query = new URLSearchParams({
          adult: String(input.adults),
          childage: input.childAges.join(","),
          currency: input.currency,
          fromdate: checkIn,
          language: input.language,
          "min-room-count": String(input.roomCount),
          nationality: input.nationality,
          "promo-code": "",
          onlybestoffer: "false",
          todate: checkOut,
        });
        return `/hotel/${configuredHotelId}/price/?${query}`;
      };

      let payload: unknown;
      try {
        payload = await request<unknown>(
          pricePath(input.checkIn, input.checkOut),
        );
      } catch (error) {
        // Eptera returns HTTP 500 for some unavailable multi-night windows,
        // while the same dates queried as one-night windows return a
        // successful price response. Confirm both boundary nights first so
        // genuine provider outages and auth failures still propagate.
        const isProviderAvailabilityError =
          error instanceof HttpError &&
          error.code === "EPTERA_REQUEST_FAILED" &&
          asRecord(error.details)?.status === 500;
        if (!isProviderAvailabilityError) throw error;
        try {
          await Promise.all([
            request<unknown>(
              pricePath(input.checkIn, addDays(input.checkIn, 1)),
            ),
            request<unknown>(
              pricePath(addDays(input.checkOut, -1), input.checkOut),
            ),
          ]);
        } catch {
          throw error;
        }
        return [];
      }
      return readOfferItems(payload).flatMap((item) => {
        const offer = asRecord(item);
        if (!offer) return [];
        const id = string(offer, "id");
        if (!id) return [];
        const room = rooms.get(number(offer, "room-type-id"));
        return [
          {
            id,
            hotelId: number(offer, "hotel-id"),
            roomTypeId: number(offer, "room-type-id"),
            roomType: string(offer, "room-type"),
            boardTypeId: number(offer, "board-type-id"),
            boardType: string(offer, "board-type"),
            rateTypeId: number(offer, "rate-type-id"),
            rateType: string(offer, "rate-type"),
            rateCodeId: number(offer, "rate-code-id"),
            priceAgencyId: number(offer, "price-agency-id"),
            currency: string(offer, "currency"),
            price: number(offer, "price"),
            discountedPrice: number(offer, "discounted-price"),
            roomToSell: nullableNumber(offer, "room-tosell"),
            cancellationPenalty: offer["cancellation-penalty"] ?? null,
            rateDescription:
              typeof offer["rate-description"] === "string"
                ? offer["rate-description"]
                : typeof offer["rate-property"] === "string"
                  ? offer["rate-property"]
                  : null,
            benefits: Array.isArray(offer.benefits)
              ? offer.benefits.filter(
                  (item): item is string => typeof item === "string",
                )
              : [],
            roomImageUrl: room?.imageUrls[0] ?? null,
            roomImageUrls: room?.imageUrls ?? [],
            roomArea: room?.area ?? null,
            roomCount: room?.count ?? null,
            roomCapacity: room?.capacity ?? null,
            roomDescription: room?.description ?? null,
            bedOptions: room?.bedOptions ?? null,
          },
        ];
      });
    },
    createReservation: (body: Record<string, unknown>) => {
      const { hotelId: configuredHotelId } = requireConfiguration();
      return request<unknown>(`/hotel/${configuredHotelId}/createReservation`, {
        body: JSON.stringify({
          "hotel-id": Number(configuredHotelId),
          ...body,
        }),
        method: "POST",
      });
    },
  };
};

export type EpteraClient = ReturnType<typeof createEpteraClient>;
