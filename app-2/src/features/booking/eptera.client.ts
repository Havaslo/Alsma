import { HttpError } from "../../lib/http/http-error.js";

const EPTERA_BASE_URL = "https://bookingapi.eptera.ru";

type EpteraClientOptions = {
  readonly apiKey?: string;
  readonly hotelId?: string;
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
  readonly roomToSell: number;
  readonly cancellationPenalty: unknown;
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
const string = (record: Record<string, unknown>, key: string): string =>
  typeof record[key] === "string" ? record[key] : "";
const number = (record: Record<string, unknown>, key: string): number =>
  typeof record[key] === "number" ? record[key] : Number(record[key]);

export const createEpteraClient = ({
  apiKey,
  hotelId,
}: EpteraClientOptions) => {
  const requireConfiguration = (): { apiKey: string; hotelId: string } => {
    if (!apiKey || !hotelId) {
      throw new HttpError(
        503,
        "EPTERA_NOT_CONFIGURED",
        "Сервис бронирования временно недоступен.",
      );
    }
    return { apiKey, hotelId };
  };

  const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
    const config = requireConfiguration();
    let response: Response;
    try {
      response = await fetch(`${EPTERA_BASE_URL}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
          ...init?.headers,
        },
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw new HttpError(
        502,
        "EPTERA_UNAVAILABLE",
        "Не удалось связаться с сервисом бронирования.",
      );
    }
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      throw new HttpError(
        response.status >= 500 ? 502 : 400,
        "EPTERA_REQUEST_FAILED",
        "Сервис бронирования не смог обработать запрос.",
        { status: response.status },
      );
    }
    return payload as T;
  };

  return {
    getOffers: async (input: {
      adults: number;
      checkIn: string;
      checkOut: string;
      childAges: number[];
      currency: string;
      language: string;
      nationality: string;
    }): Promise<EpteraOffer[]> => {
      const { hotelId: configuredHotelId } = requireConfiguration();
      const query = new URLSearchParams({
        adult: String(input.adults),
        childage: input.childAges.join(","),
        currency: input.currency,
        fromdate: input.checkIn,
        language: input.language,
        nationality: input.nationality,
        onlybestoffer: "false",
        todate: input.checkOut,
      });
      const payload = await request<unknown>(
        `/hotel/${configuredHotelId}/price/?${query}`,
      );
      if (!Array.isArray(payload)) return [];
      return payload.flatMap((item) => {
        const offer = asRecord(item);
        if (!offer) return [];
        const id = string(offer, "id");
        if (!id) return [];
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
            roomToSell: number(offer, "room-tosell"),
            cancellationPenalty: offer["cancellation-penalty"] ?? null,
          },
        ];
      });
    },
    createReservation: (body: Record<string, unknown>) => {
      const { hotelId: configuredHotelId } = requireConfiguration();
      return request<unknown>(`/hotel/${configuredHotelId}/createReservation`, {
        body: JSON.stringify(body),
        method: "POST",
      });
    },
  };
};

export type EpteraClient = ReturnType<typeof createEpteraClient>;
