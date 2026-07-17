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
                <div className="h-56 overflow-hidden"><img alt={offer.title} className="size-full object-cover transition duration-500 group-hover:scale-105" src={offer.image} /></div>
                <div className="flex flex-1 flex-col p-7">
                  <span className="w-fit rounded-full border border-brand-foreground/20 bg-brand-foreground/10 px-3 py-1.5 text-xs font-semibold uppercase">{offer.tag}</span>
                  <h3 className="mt-4 font-heading text-3xl font-semibold">{offer.title}</h3>
                  <p className="mt-4 leading-7 text-brand-foreground/80">{offer.description}</p>
                  <span className="mt-6 font-semibold text-accent-ui">Подробнее ↗</span>
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
        </div>
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {events.map((event) => (
            <article
              className="rounded-3xl border border-line p-7"
              key={event.title}
            >
              <div className="flex items-center justify-between gap-4 text-sm text-brand">
                <span className="flex items-center gap-2">
                  <CalendarDays className="size-4" /> {event.date}
                </span>
                <span className="flex items-center gap-2">
                  <Tag className="size-4" /> {event.tag}
                </span>
              </div>
              <h3 className="mt-6 font-heading text-3xl font-semibold">
                {event.title}
              </h3>
              <p className="mt-4 leading-7 text-muted-ui-foreground">
                {event.description}
              </p>
            </article>
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
