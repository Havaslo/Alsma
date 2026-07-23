import { CalendarDays, Check, Tag } from "lucide-react";

import heroImage from "@/assets/alsma/offers-hero.jpg";
import { PublicHero } from "@/components/site/PublicHero";
import { SiteHeader } from "@/components/site/SiteHeader";
import { getSiteCollection } from "@/lib/site/content-collections";
import {
  ACTIVE_OFFERS,
  OFFER_EVENTS,
  READY_SCENARIOS,
} from "@/lib/site/offers";
import { PUBLIC_PAGES } from "@/lib/site/public-pages";
import { usePublishedSiteContent } from "@/lib/site/useSiteContent";

export const OffersPage = () => {
  const page = PUBLIC_PAGES.offers;
  const content = usePublishedSiteContent("offers");
  const hero = content.data?.items.find(
    (item) => item.itemKey === "hero",
  )?.content;
  const title =
    typeof hero?.title === "string"
      ? hero.title
      : "Акции для отдыха в любой сезон";
  const description =
    typeof hero?.description === "string" ? hero.description : page.description;
  const offers = getSiteCollection(
    content.data?.items,
    "proposals",
    ACTIVE_OFFERS,
  );
  const scenarios = getSiteCollection(
    content.data?.items,
    "ready-scenarios",
    READY_SCENARIOS,
  );
  const events = getSiteCollection(content.data?.items, "events", OFFER_EVENTS);
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
      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8" id="details">
        <div className="text-center">
          <p className="text-sm font-semibold tracking-widest text-brand uppercase">
            Актуальные акции
          </p>
          <h2 className="mt-4 font-heading text-4xl font-semibold sm:text-5xl">
            Все действующие предложения
          </h2>
        </div>
        <div className="mt-12 grid gap-7 md:grid-cols-2 xl:grid-cols-3">
          {offers.map((offer) => (
            <article
              className="group flex overflow-hidden rounded-4xl bg-brand text-brand-foreground"
              key={offer.title}
            >
              <div className="flex min-h-full flex-col">
                <div className="h-56 overflow-hidden">
                  <img
                    alt={offer.title}
                    className="size-full object-cover transition duration-500 group-hover:scale-105"
                    src={offer.image}
                  />
                </div>
                <div className="flex flex-1 flex-col p-7">
                  <span className="w-fit rounded-full border border-brand-foreground/20 bg-brand-foreground/10 px-3 py-1.5 text-xs font-semibold uppercase">
                    {offer.tag}
                  </span>
                  <h3 className="mt-4 font-heading text-3xl font-semibold">
                    {offer.title}
                  </h3>
                  <p className="mt-4 leading-7 text-brand-foreground/80">
                    {offer.description}
                  </p>
                  <span className="mt-6 font-semibold text-accent-ui">
                    Подробнее ↗
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="bg-panel py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="text-center">
            <p className="text-sm font-semibold tracking-widest text-brand uppercase">
              Пакетные предложения
            </p>
            <h2 className="mt-4 font-heading text-4xl font-semibold sm:text-5xl">
              Готовые сценарии отдыха
            </h2>
          </div>
          <div className="mt-12 grid gap-8 xl:grid-cols-2">
            {scenarios.map((scenario) => (
              <article
                className="overflow-hidden rounded-4xl bg-page"
                key={scenario.title}
              >
                <img
                  alt={scenario.title}
                  className="h-80 w-full object-cover"
                  src={scenario.image}
                />
                <div className="flex flex-col p-8 sm:p-10">
                  <h3 className="font-heading text-4xl font-semibold">
                    {scenario.title}
                  </h3>
                  <p className="mt-5 leading-7 text-muted-ui-foreground">
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
                  <p className="mt-auto pt-8 text-2xl font-semibold text-brand">
                    {scenario.price}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
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
              <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {group.events.map((event) => (
                  <article
                    className="overflow-hidden rounded-3xl border border-line bg-page"
                    key={event.title}
                  >
                    <div className="relative aspect-square overflow-hidden">
                      <img
                        alt={event.title}
                        className="size-full object-cover"
                        src={
                          event.image ??
                          OFFER_EVENTS[
                            Math.min(
                              events.indexOf(event),
                              OFFER_EVENTS.length - 1,
                            )
                          ].image
                        }
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
                ))}
              </div>
            </section>
          ))}
        </div>
        <div className="mt-12 rounded-3xl bg-brand/10 p-8">
          <h3 className="font-heading text-3xl font-semibold text-brand">
            Общие условия акций
          </h3>
          <ul className="mt-6 grid gap-4 md:grid-cols-2">
            {[
              "Предложения действуют при наличии свободных мест",
              "Скидки и специальные тарифы не суммируются",
              "Состав программы уточняется при бронировании",
              "Даты проведения могут быть скорректированы",
            ].map((item) => (
              <li className="flex gap-3" key={item}>
                <Check className="mt-1 size-4 shrink-0 text-brand" /> {item}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
};
