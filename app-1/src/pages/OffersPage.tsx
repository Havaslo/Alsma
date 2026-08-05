import { useState } from "react";

import { ArrowUpRight, CalendarDays, Check, Tag } from "lucide-react";

import heroImage from "@/assets/alsma/offers-hero.jpg";
import { PublicHero } from "@/components/site/PublicHero";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Modal } from "@/components/ui/Modal";
import { getSiteCollection } from "@/lib/site/content-collections";
import { resolveMediaUrl } from "@/lib/site/media-url";
import {
  ACTIVE_OFFERS,
  type ActiveOffer,
  OFFER_EVENTS,
  type OfferEvent,
  READY_SCENARIOS,
  type ReadyScenario,
} from "@/lib/site/offers";
import { PUBLIC_PAGES } from "@/lib/site/public-pages";
import { usePublishedSiteContent } from "@/lib/site/useSiteContent";

const formatOfferDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const getOfferMonth = (value: string) => {
  const month = new Date(`${value}T00:00:00`).toLocaleDateString("ru-RU", {
    month: "long",
  });
  return `${month.charAt(0).toUpperCase()}${month.slice(1)}`;
};

const getToday = () => {
  const today = new Date();
  const month = `${today.getMonth() + 1}`.padStart(2, "0");
  const day = `${today.getDate()}`.padStart(2, "0");
  return `${today.getFullYear()}-${month}-${day}`;
};

const scenarioCtaLabels = [
  "Подробнее",
  "Забронировать",
  "Выбрать программу",
] as const;

export const OffersPage = () => {
  const [selectedOffer, setSelectedOffer] = useState<ActiveOffer>();
  const page = PUBLIC_PAGES.offers;
  const content = usePublishedSiteContent("offers");
  const hero = content.data?.items?.find(
    (item) => item.itemKey === "hero",
  )?.content;
  const title =
    typeof hero?.title === "string"
      ? hero.title
      : "Акции для отдыха в любой сезон";
  const description =
    typeof hero?.description === "string" ? hero.description : page.description;
  const offers = [
    ...getSiteCollection<ActiveOffer>(
      content.data?.items,
      "proposals",
      ACTIVE_OFFERS,
    ),
  ]
    .filter((item) => item.isActive !== false)
    .sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0));
  const scenarios = [
    ...getSiteCollection<ReadyScenario>(
      content.data?.items,
      "ready-scenarios",
      READY_SCENARIOS,
    ),
  ]
    .filter((item) => item.isActive !== false)
    .sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0));
  const events = [
    ...getSiteCollection<OfferEvent>(
      content.data?.items,
      "events",
      OFFER_EVENTS,
    ),
  ]
    .filter((item) => {
      const expirationDate = item.endDate ?? item.startDate;
      return (
        item.isActive !== false &&
        (!expirationDate || expirationDate >= getToday())
      );
    })
    .sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0))
    .map((item) => ({
      ...item,
      date: item.startDate
        ? [
            formatOfferDate(item.startDate),
            item.endDate ? formatOfferDate(item.endDate) : "",
          ]
            .filter(Boolean)
            .join(" — ")
        : item.date,
      month: item.startDate ? getOfferMonth(item.startDate) : item.month,
    }));
  const eventMonths = [
    {
      events: events.slice(0, 1),
      month: events[0]?.month ?? OFFER_EVENTS[0].month,
    },
    {
      events: events.slice(1),
      month: events[1]?.month ?? OFFER_EVENTS[1].month,
    },
  ].filter((group) => group.events.length > 0);

  return (
    <main className="min-h-screen bg-page text-page-foreground">
      <SiteHeader />
      <PublicHero
        description={description}
        eyebrow="Специальные предложения"
        image={typeof hero?.image === "string" ? hero.image : heroImage}
        title={title}
      />
      <section
        className="mx-auto max-w-[100rem] px-5 py-24 sm:px-8"
        id="details"
      >
        <div className="text-center">
          <p className="text-sm font-semibold tracking-widest text-brand uppercase">
            Актуальные акции
          </p>
          <h2 className="mt-4 font-heading text-4xl font-semibold sm:text-5xl">
            Все действующие предложения
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-muted-ui-foreground">
            Собрали предложения для тех, кто хочет провести время у нас с
            удовольствием — выбирайте то, что ближе именно вам.
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {offers.map((offer) => (
            <article
              className="group flex overflow-hidden rounded-3xl bg-brand text-brand-foreground"
              key={offer.title}
            >
              <div className="flex min-h-full flex-col">
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    alt={offer.title}
                    className="size-full object-cover transition duration-500 group-hover:scale-105"
                    src={resolveMediaUrl(offer.image)}
                  />
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <span className="w-fit rounded-full border border-brand-foreground/20 bg-brand-foreground/10 px-3 py-1.5 text-xs font-semibold uppercase">
                    {offer.tag}
                  </span>
                  <h3 className="mt-4 font-heading text-2xl font-semibold">
                    {offer.title}
                  </h3>
                  <p className="mt-3 line-clamp-4 leading-7 text-brand-foreground/80">
                    {offer.description}
                  </p>
                  <button
                    className="mt-auto inline-flex items-center gap-2 pt-6 text-left font-semibold text-accent-ui"
                    onClick={() => setSelectedOffer(offer)}
                    type="button"
                  >
                    Подробнее <ArrowUpRight className="size-4" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
      <Modal
        className="bg-page text-page-foreground"
        hideHeader
        onClose={() => setSelectedOffer(undefined)}
        open={Boolean(selectedOffer)}
        title={selectedOffer?.title ?? "Акция"}
      >
        {selectedOffer && (
          <>
            <img
              alt={selectedOffer.title}
              className="relative -mx-6 block aspect-video w-[calc(100%+3rem)] max-w-none shrink-0 object-cover"
              src={resolveMediaUrl(selectedOffer.image)}
            />
            <div className="px-1 py-5">
              <h2 className="font-heading text-3xl font-semibold text-brand">
                {selectedOffer.title}
              </h2>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-supporting/30 px-3 py-1.5 text-xs font-semibold text-brand">
                  {selectedOffer.tag}
                </span>
              </div>
              <p className="mt-5 leading-8 whitespace-pre-line text-page-foreground">
                {selectedOffer.description}
              </p>
              {selectedOffer.buttonLink && (
                <a
                  className="mt-6 inline-flex items-center gap-2 font-semibold text-brand"
                  href={selectedOffer.buttonLink}
                >
                  Перейти к предложению
                  <ArrowUpRight className="size-4" />
                </a>
              )}
            </div>
          </>
        )}
      </Modal>
      <section className="bg-panel py-24">
        <div className="mx-auto max-w-[100rem] px-5 sm:px-8">
          <div className="text-center">
            <p className="text-sm font-semibold tracking-widest text-brand uppercase">
              Пакетные предложения
            </p>
            <h2 className="mt-4 font-heading text-4xl font-semibold sm:text-5xl">
              Готовые сценарии отдыха
            </h2>
            <p className="mx-auto mt-4 max-w-3xl text-muted-ui-foreground">
              Подберите программу с проживанием, процедурами и дополнительными
              впечатлениями в одном предложении.
            </p>
          </div>
          <div className="mt-12 grid gap-8 xl:grid-cols-2">
            {scenarios.map((scenario, index) => (
              <article
                className="overflow-hidden rounded-3xl bg-brand-foreground"
                key={scenario.title}
              >
                <img
                  alt={scenario.title}
                  className="aspect-video w-full object-cover"
                  src={resolveMediaUrl(scenario.image)}
                />
                <div className="flex flex-col p-7 sm:p-8">
                  <h3 className="font-heading text-3xl font-semibold">
                    {scenario.title}
                  </h3>
                  <p className="mt-4 leading-7 text-muted-ui-foreground">
                    {scenario.description}
                  </p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    {scenario.tags.map((tag) => (
                      <span
                        className="rounded-full bg-brand/10 px-4 py-2 text-sm text-brand"
                        key={tag}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="mt-8 flex flex-wrap items-end justify-between gap-5">
                    <div>
                      <p className="text-sm text-muted-ui-foreground">
                        Стоимость программы
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-brand">
                        {scenario.price}
                      </p>
                    </div>
                    <a
                      className="inline-flex min-h-11 items-center rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-brand-foreground"
                      href={scenario.buttonLink || "/#booking"}
                    >
                      {scenario.buttonText ||
                        scenarioCtaLabels[index] ||
                        "Подробнее"}
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-[100rem] px-5 py-24 sm:px-8">
        <div className="text-center">
          <p className="text-sm font-semibold tracking-widest text-brand uppercase">
            Календарь акций
          </p>
          <h2 className="mt-4 font-heading text-4xl font-semibold sm:text-5xl">
            Мероприятия и спецпредложения по месяцам
          </h2>
          <p className="mx-auto mt-5 max-w-4xl text-lg leading-8 text-muted-ui-foreground">
            Это не классический календарь, а удобный список событий и
            праздничных программ, которые помогут спланировать заезд на нужные
            даты.
          </p>
        </div>
        <div className="mt-14 space-y-5">
          {eventMonths.map((group) => (
            <section
              className="rounded-4xl border border-line bg-panel p-5 sm:p-6"
              key={group.month}
            >
              <div className="flex items-center justify-between gap-4 border-b border-line pb-4">
                <h3 className="font-heading text-3xl font-semibold">
                  {group.month}
                </h3>
                <span className="rounded-full bg-page px-4 py-2 text-xs font-semibold tracking-wider text-brand uppercase">
                  {group.events.length}{" "}
                  {group.events.length === 1 ? "событие" : "события"}
                </span>
              </div>
              <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                {group.events.map((event) => {
                  const card = (
                    <article
                      className="group overflow-hidden rounded-3xl border border-line bg-page transition duration-300 group-hover:-translate-y-1 group-hover:shadow-xl"
                      key={event.title}
                    >
                      <div className="relative aspect-square overflow-hidden">
                        <img
                          alt={event.title}
                          className="size-full object-cover transition duration-500 group-hover:scale-105"
                          src={resolveMediaUrl(event.image)}
                        />
                        <div className="absolute inset-x-3 top-3 flex flex-wrap gap-2">
                          <span className="flex items-center gap-2 rounded-full bg-page/90 px-3 py-2 text-xs font-semibold text-brand backdrop-blur-sm">
                            <CalendarDays className="size-3.5" /> {event.date}
                          </span>
                          <span className="flex items-center gap-2 rounded-full bg-accent-ui/90 px-3 py-2 text-xs font-semibold text-accent-ui-foreground backdrop-blur-sm">
                            <Tag className="size-3.5" /> {event.tag}
                          </span>
                        </div>
                      </div>
                      <div className="p-6">
                        <h4 className="font-heading text-2xl font-semibold">
                          {event.title}
                        </h4>
                        <p className="mt-3 leading-7 text-muted-ui-foreground">
                          {event.description}
                        </p>
                      </div>
                    </article>
                  );

                  return event.buttonLink ? (
                    <a
                      className="group block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
                      href={event.buttonLink}
                      key={event.title}
                    >
                      {card}
                    </a>
                  ) : (
                    card
                  );
                })}
              </div>
            </section>
          ))}
        </div>
        <div className="mt-12 rounded-3xl bg-panel p-8">
          <h3 className="font-heading text-3xl font-semibold text-brand">
            Общие условия акций
          </h3>
          <ul className="mt-6 grid gap-3">
            {[
              "Акции действуют при бронировании через официальный сайт или ресепшен отеля.",
              "Количество номеров по акционным ценам ограничено.",
              "Скидки не суммируются с другими предложениями.",
              "Для участия в мастер-классах и экскурсиях необходима предварительная запись.",
              "Актуальные даты и условия уточняйте на сайте отеля или у менеджеров.",
            ].map((item) => (
              <li
                className="flex gap-3 rounded-2xl bg-brand-foreground px-5 py-4"
                key={item}
              >
                <Check className="mt-1 size-4 shrink-0 text-brand" /> {item}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
};
