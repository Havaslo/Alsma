import { CalendarDays, Check, Tag } from "lucide-react";

import heroImage from "@/assets/alsma/offers-hero.jpg";
import { LeadRequestForm } from "@/components/site/LeadRequestForm";
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
        <div className="mt-12 grid gap-7 lg:grid-cols-3">
          {offers.map((offer) => (
            <article
              className="group relative min-h-[32rem] overflow-hidden rounded-4xl text-brand-foreground"
              key={offer.title}
            >
              <img
                alt={offer.title}
                className="absolute inset-0 size-full object-cover transition duration-500 group-hover:scale-105"
                src={offer.image}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-page-foreground/90 via-page-foreground/30 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-7">
                <span className="rounded-full bg-panel px-4 py-2 text-sm font-semibold text-brand">
                  {offer.tag}
                </span>
                <h3 className="mt-5 font-heading text-3xl font-semibold">
                  {offer.title}
                </h3>
                <p className="mt-4 leading-7 text-brand-foreground/80">
                  {offer.description}
                </p>
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
          <div className="mt-12 space-y-8">
            {scenarios.map((scenario, index) => (
              <article
                className="overflow-hidden rounded-4xl bg-page lg:grid lg:grid-cols-[2fr_3fr]"
                key={scenario.title}
              >
                <img
                  alt={scenario.title}
                  className={`aspect-[4/3] size-full object-cover ${index % 2 ? "lg:order-2" : ""}`}
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
            Ближайшие мероприятия
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
      <section className="bg-brand py-20 text-brand-foreground">
        <div className="mx-auto max-w-5xl px-5 sm:px-8">
          <h2 className="font-heading text-4xl font-semibold sm:text-5xl">
            Подобрать специальное предложение
          </h2>
          <p className="mt-4 mb-8 text-lg text-brand-foreground/75">
            Оставьте контакты — мы уточним даты и подберём подходящий сценарий.
          </p>
          <LeadRequestForm
            formCode="offer-request"
            formTitle="Заявка по специальному предложению"
            sourcePage="offers"
          />
        </div>
      </section>
    </main>
  );
};
