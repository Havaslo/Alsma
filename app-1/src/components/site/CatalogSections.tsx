import { useState } from "react";

import { CalendarDays } from "lucide-react";

import { useApiQuery } from "@/lib/query/use-api-query";
import { useServiceCart } from "@/lib/services/service-cart";
import {
  type Service,
  type ServiceVariant,
  loadServiceAvailability,
  loadServiceSections,
} from "@/lib/services/services-api";

const VariantOption = ({
  service,
  variant,
}: {
  readonly service: Service;
  readonly variant: ServiceVariant;
}) => {
  const cart = useServiceCart();
  const [date, setDate] = useState("");
  const availability = useApiQuery(
    ["catalog-availability", variant.id, date],
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
        {variant.durationMin ? `${variant.durationMin} минут · ` : ""}
        Вместимость: {variant.capacity}
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
      {date ? (
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
            {availability.data?.blocks.map((slot) => (
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
      ) : (
        <p className="mt-3 flex items-center gap-2 text-xs text-muted-ui-foreground">
          <CalendarDays className="size-4" /> Выберите дату и слот
        </p>
      )}
    </div>
  );
};

export const CatalogSections = ({
  afterBlock,
  fallback,
  page,
}: {
  readonly afterBlock?: number;
  readonly fallback?: boolean;
  readonly page: string;
}) => {
  const sections = useApiQuery(["public-service-sections", page], (signal) =>
    loadServiceSections(page, signal),
  );
  const visibleSections = (sections.data?.sections ?? []).filter(
    (section) =>
      section.services.length > 0 &&
      (fallback
        ? section.blockNumber > (afterBlock ?? 0)
        : afterBlock === undefined || section.blockNumber === afterBlock),
  );
  if (!visibleSections.length) return null;

  return (
    <div className="contents">
      {visibleSections.map((section) => (
        <section
          className="mx-auto w-full max-w-[100rem] px-5 py-16 sm:px-8 sm:py-24"
          data-catalog-block={section.blockNumber}
          key={section.id}
        >
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold tracking-[0.2em] text-brand uppercase">
              Услуги и товары
            </p>
            <h2 className="mt-3 font-heading text-4xl font-semibold sm:text-5xl">
              {section.heading}
            </h2>
            {section.subheading && (
              <p className="mt-5 text-lg leading-8 text-muted-ui-foreground">
                {section.subheading}
              </p>
            )}
          </div>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {section.services.map((service) => (
              <article
                className="rounded-3xl border border-line bg-panel p-6"
                key={service.id}
              >
                <h3 className="font-heading text-2xl font-semibold text-brand">
                  {service.name}
                </h3>
                {service.description && (
                  <p className="mt-3 text-sm text-muted-ui-foreground">
                    {service.description}
                  </p>
                )}
                <div className="mt-6 space-y-3">
                  {service.variants.map((variant) => (
                    <VariantOption
                      key={variant.id}
                      service={service}
                      variant={variant}
                    />
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};
