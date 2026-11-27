import { useState } from "react";

import { SiteHeader } from "@/components/site/SiteHeader";
import { TravelLineWidget } from "@/components/site/TravelLineWidget";
import { apiUrl } from "@/lib/api/api-base-url";
import {
  canEmbedTravelLine,
  useTravelLineConfig,
} from "@/lib/booking/travelline-widget-config";
import { BookingPage } from "@/pages/BookingPage";

const initialDate = (offset: number) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const departureDate = (arrival: string, nights: string | null) => {
  const duration = Number(nights);
  if (!Number.isInteger(duration) || duration < 1 || duration > 100)
    return undefined;
  const date = new Date(arrival + "T00:00:00Z");
  if (!Number.isFinite(date.getTime())) return undefined;
  date.setUTCDate(date.getUTCDate() + duration);
  return date.toISOString().slice(0, 10);
};

const TravelLineForm = ({
  ready,
  standalone = true,
}: {
  ready: boolean;
  standalone?: boolean;
}) => {
  const params = new URLSearchParams(window.location.search);
  const arrival = params.get("checkIn") ?? params.get("date") ?? initialDate(7);
  const [checkIn, setCheckIn] = useState(arrival);
  const [checkOut, setCheckOut] = useState(
    params.get("checkOut") ??
      departureDate(arrival, params.get("nights")) ??
      initialDate(9),
  );
  const [adults, setAdults] = useState(
    Math.max(1, Math.min(12, Number(params.get("adults")) || 2)),
  );
  const [childAges, setChildAges] = useState(
    params.get("childAges") ?? params.get("children-age") ?? "",
  );
  const [error, setError] = useState("");
  const form = (
    <section className={standalone ? "mx-auto max-w-3xl px-5 py-12" : ""}>
      {standalone && (
        <h1 className="font-heading text-3xl font-semibold">
          Бронирование проживания
        </h1>
      )}
      <p className="mt-4 text-muted-ui-foreground">
        Выбор номера, оформление и оплата проходят в защищённой форме
        TravelLine. Данные бронирования подтвердятся после завершения
        оформления.
      </p>
      {!ready ? (
        <p role="status" className="mt-6 rounded-2xl bg-panel p-6">
          Онлайн-бронирование готовится к запуску. Обратитесь в отдел
          бронирования отеля.
        </p>
      ) : (
        <form
          className="mt-7 grid gap-5 rounded-3xl bg-panel p-6"
          onSubmit={(event) => {
            event.preventDefault();
            const ages = childAges.trim()
              ? childAges
                  .split(",")
                  .map((x) => (x.trim() ? Number(x.trim()) : NaN))
              : [];
            if (
              checkOut <= checkIn ||
              ages.length > 8 ||
              ages.some((x) => !Number.isInteger(x) || x < 0 || x > 17)
            ) {
              setError("Проверьте даты и возраст детей (от 0 до 17 лет).");
              return;
            }
            const query = new URLSearchParams({
              checkIn,
              checkOut,
              adults: String(adults),
              childAges: ages.join(","),
              roomCount: "1",
            });
            window.location.assign(apiUrl(`/travelline/checkout?${query}`));
          }}
        >
          <label className="grid gap-2">
            Дата заезда
            <input
              required
              type="date"
              value={checkIn}
              onChange={(e) => {
                setCheckIn(e.target.value);
                setError("");
              }}
              className="rounded-xl border border-line bg-page p-3"
            />
          </label>
          <label className="grid gap-2">
            Дата выезда
            <input
              required
              type="date"
              value={checkOut}
              onChange={(e) => {
                setCheckOut(e.target.value);
                setError("");
              }}
              className="rounded-xl border border-line bg-page p-3"
            />
          </label>
          <label className="grid gap-2">
            Взрослые
            <input
              required
              type="number"
              min={1}
              max={12}
              value={adults}
              onChange={(e) => {
                setAdults(Number(e.target.value));
                setError("");
              }}
              className="rounded-xl border border-line bg-page p-3"
            />
          </label>
          <label className="grid gap-2">
            Возраст детей через запятую (если едут с вами)
            <input
              value={childAges}
              onChange={(e) => {
                setChildAges(e.target.value);
                setError("");
              }}
              placeholder="Например: 5, 10"
              className="rounded-xl border border-line bg-page p-3"
            />
          </label>
          <p className="text-sm text-muted-ui-foreground">
            Несколько номеров можно выбрать в форме TravelLine. Наличие и
            окончательная стоимость уточняются при оформлении.
          </p>
          {error && (
            <p role="alert" className="text-red-700">
              {error}
            </p>
          )}
          <button
            type="submit"
            className="rounded-full bg-brand px-6 py-3 font-semibold text-brand-foreground"
          >
            Перейти к выбору номера
          </button>
        </form>
      )}
    </section>
  );
  return standalone ? (
    <main className="min-h-screen bg-page text-page-foreground">
      <SiteHeader light staticPosition transparentAtTop={false} />
      {form}
    </main>
  ) : (
    form
  );
};

export const BookingEntryPage = () => {
  const query = useTravelLineConfig();
  if (query.isPending)
    return (
      <main className="grid min-h-screen place-items-center" role="status">
        Загружаем бронирование…
      </main>
    );
  if (query.isError)
    return (
      <main className="grid min-h-screen place-items-center px-5">
        <div>
          <p>
            Не удалось загрузить бронирование. Обновите страницу или свяжитесь с
            отелем.
          </p>
          <button
            type="button"
            className="mt-4 underline"
            onClick={() => void query.refetch()}
          >
            Повторить
          </button>
        </div>
      </main>
    );
  if (query.data.enabled && query.data.checkoutReady && canEmbedTravelLine()) {
    return (
      <main className="min-h-screen bg-page text-page-foreground">
        <SiteHeader light staticPosition transparentAtTop={false} />
        <section className="mx-auto max-w-[1440px] px-4 pt-9 sm:px-6">
          <h1 className="mb-5 font-heading text-3xl font-semibold">
            Бронирование проживания
          </h1>
          <TravelLineWidget
            kind="booking-form"
            unavailable={
              <p role="status" className="py-5 text-muted-ui-foreground">
                Форма не загрузилась. Откройте отдельную форму TravelLine ниже.
              </p>
            }
            fallback={
              <p role="status" className="py-5 text-muted-ui-foreground">
                Загружаем форму TravelLine…
              </p>
            }
          />
          <details className="my-6 rounded-xl bg-panel p-4">
            <summary className="cursor-pointer font-medium">
              Открыть отдельную форму TravelLine
            </summary>
            <TravelLineForm ready standalone={false} />
          </details>
        </section>
      </main>
    );
  }
  return query.data.enabled ? (
    <TravelLineForm ready={query.data.checkoutReady} />
  ) : (
    <BookingPage />
  );
};
