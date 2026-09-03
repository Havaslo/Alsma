import { useState } from "react";

import { CalendarDays } from "lucide-react";

import { SiteHeader } from "@/components/site/SiteHeader";
import { useApiQuery } from "@/lib/query/use-api-query";
import { useServiceCart } from "@/lib/services/service-cart";
import {
  type Service,
  type ServiceVariant,
  loadServiceAvailability,
  loadServices,
} from "@/lib/services/services-api";

const VariantCard = ({
  service,
  variant,
}: {
  readonly service: Service;
  readonly variant: ServiceVariant;
}) => {
  const cart = useServiceCart();
  const [date, setDate] = useState("");
  const slots = useApiQuery(
    ["availability", variant.id, date],
    (signal) => loadServiceAvailability(service.id, variant.id, date, signal),
    { enabled: Boolean(date), errorMessage: "Не удалось загрузить слоты." },
  );
  return (
    <div className="rounded-2xl bg-page p-4">
      <div className="flex justify-between gap-3">
        <strong>{variant.name}</strong>
        <span className="font-semibold text-brand">
          {Number(variant.price).toLocaleString("ru-RU")} ₽
        </span>
      </div>
      <p className="mt-2 text-xs text-muted-ui-foreground">
        Вместимость: {variant.capacity} · {variant.durationMin} минут
      </p>
      <label className="mt-3 block text-xs font-semibold text-brand">
        Дата
        <input
          className="mt-1 w-full rounded-xl border border-line bg-panel p-2"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
      </label>
      {date && (
        <label className="mt-3 block text-xs font-semibold text-brand">
          Свободный слот
          <select
            className="mt-1 w-full rounded-xl border border-line bg-panel p-2"
            defaultValue=""
            onChange={(event) => {
              if (event.target.value)
                cart.add({
                  variantId: variant.id,
                  quantity: 1,
                  startsAt: event.target.value,
                  serviceName: service.name,
                  variantName: variant.name,
                });
            }}
          >
            <option value="">Выберите время</option>
            {slots.data?.blocks.map((slot) => (
              <option key={slot.startsAt} value={slot.startsAt}>
                {new Date(slot.startsAt).toLocaleTimeString("ru-RU", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                –
                {new Date(slot.endsAt).toLocaleTimeString("ru-RU", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </option>
            ))}
          </select>
        </label>
      )}
      {!date && (
        <p className="mt-3 flex items-center gap-2 text-xs text-muted-ui-foreground">
          <CalendarDays className="size-4" /> Выберите дату и слот
        </p>
      )}
    </div>
  );
};

export const ServicesPage = () => {
  const services = useApiQuery(["services"], (signal) => loadServices(signal));
  return (
    <main className="min-h-screen bg-page px-4 pt-24 pb-20 sm:pt-32">
      <SiteHeader light />
      <div className="mx-auto max-w-[100rem]">
        <header className="max-w-2xl">
          <p className="text-sm font-semibold tracking-[0.2em] text-brand uppercase">
            ALSMA wellness
          </p>
          <h1 className="mt-3 font-heading text-5xl font-semibold text-brand">
            Услуги и впечатления
          </h1>
          <p className="mt-5 text-lg text-muted-ui-foreground">
            Выберите вариант, дату и свободный слот — выбранные записи
            сохранятся в общей корзине.
          </p>
        </header>
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {services.data?.services.map((service) => (
            <article
              className="rounded-3xl border border-line bg-panel p-6"
              key={service.id}
            >
              <h2 className="font-heading text-2xl font-semibold text-brand">
                {service.name}
              </h2>
              <p className="mt-3 text-sm text-muted-ui-foreground">
                {service.description}
              </p>
              <div className="mt-6 space-y-3">
                {service.variants.map((variant) => (
                  <VariantCard
                    key={variant.id}
                    service={service}
                    variant={variant}
                  />
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
};
