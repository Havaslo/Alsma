import { Check } from "lucide-react";

import entertainmentHeroImage from "@/assets/alsma/spa-forest-walk.jpg";
import { HorizontalCarousel } from "@/components/site/HorizontalCarousel";
import { PublicHero } from "@/components/site/PublicHero";
import { SiteHeader } from "@/components/site/SiteHeader";
import { getSiteCollection } from "@/lib/site/content-collections";
import {
  ACTIVE_ZONES,
  ANIMATION_PROGRAM,
  EQUIPMENT,
  KIDS_SERVICES,
  SEASONS,
} from "@/lib/site/entertainment";
import { PUBLIC_PAGES } from "@/lib/site/public-pages";
import { usePublishedSiteContent } from "@/lib/site/useSiteContent";

export const EntertainmentPage = () => {
  const page = PUBLIC_PAGES.entertainment;
  const content = usePublishedSiteContent("entertainment");
  const hero = content.data?.items.find(
    (item) => item.itemKey === "hero",
  )?.content;
  const title =
    typeof hero?.title === "string" ? hero.title : "Развлечения и анимация";
  const description =
    typeof hero?.description === "string" ? hero.description : page.description;
  const zones = getSiteCollection(
    content.data?.items,
    "active-zones",
    ACTIVE_ZONES,
  );
  const seasons = getSiteCollection(
    content.data?.items,
    "seasonal-slides",
    SEASONS,
  );
  const programs = getSiteCollection(
    content.data?.items,
    "animation-programs",
    ANIMATION_PROGRAM,
  );
  const equipment = getSiteCollection(
    content.data?.items,
    "equipment-cards",
    EQUIPMENT,
  );
  const kidsServices = getSiteCollection(
    content.data?.items,
    "kids-services",
    KIDS_SERVICES,
  );

  return (
    <main className="min-h-screen bg-page text-page-foreground">
      <SiteHeader />
      <PublicHero
        description={description}
        eyebrow="Активности и семейный отдых"
        image={
          typeof hero?.image === "string" ? hero.image : entertainmentHeroImage
        }
        title={title}
      />
      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8" id="details">
        <div className="text-center">
          <p className="text-sm font-semibold tracking-widest text-brand uppercase">
            На территории комплекса
          </p>
          <h2 className="mt-4 font-heading text-4xl font-semibold sm:text-5xl">
            Территория для активного отдыха
          </h2>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {zones.map((zone) => (
            <article
              className="overflow-hidden rounded-4xl bg-panel"
              key={zone.title}
            >
              <img
                alt={zone.title}
                className="h-64 w-full object-cover"
                src={zone.image}
              />
              <div className="p-7">
                <h3 className="font-heading text-3xl font-semibold text-brand">
                  {zone.title}
                </h3>
                <p className="mt-4 leading-7 text-muted-ui-foreground">
                  {zone.description}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {zone.tags.map((tag) => (
                    <span
                      className="rounded-full bg-brand/10 px-4 py-2 text-sm text-brand"
                      key={tag}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="bg-panel/60 py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="text-center">
            <p className="text-sm font-semibold text-brand">Круглый год</p>
            <h2 className="mt-4 font-heading text-4xl font-semibold sm:text-5xl">Сезонные активности</h2>
            <p className="mt-5 text-lg text-muted-ui-foreground">Развлечения на свежем воздухе круглый год</p>
          </div>
          <HorizontalCarousel className="mt-10" slideClassName="basis-full">
            {seasons.map((season) => (
              <article
                className="relative min-h-[44rem] overflow-hidden rounded-4xl text-brand-foreground"
                key={season.label}
              >
                <img
                  alt={season.title}
                  className="absolute inset-0 size-full object-cover"
                  src={season.image}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-page-foreground/90 via-page-foreground/35 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-8 lg:p-14">
                  <div className="max-w-3xl rounded-3xl bg-page-foreground/30 p-7 backdrop-blur-sm">
                  <span className="rounded-full bg-panel px-4 py-2 text-sm font-semibold text-brand">
                    {season.label}
                  </span>
                  <h3 className="mt-5 font-heading text-4xl font-semibold">
                    {season.title}
                  </h3>
                  <p className="mt-3 text-brand-foreground/80">
                    {season.description}
                  </p>
                  <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                    {season.items.map((item) => (
                      <li
                        className="rounded-xl bg-brand-foreground/10 px-4 py-3 backdrop-blur"
                        key={item}
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                  </div>
                </div>
              </article>
            ))}
          </HorizontalCarousel>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="text-center">
          <p className="text-sm font-semibold text-brand">Каждый день</p>
          <h2 className="mt-4 font-heading text-4xl font-semibold sm:text-5xl">Программа анимации</h2>
          <p className="mt-5 text-lg text-muted-ui-foreground">Ежедневная развлекательная программа</p>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {programs.map(([time, activity, details, age]) => (
            <article className="flex min-h-64 flex-col rounded-3xl bg-panel p-6" key={activity}>
              <div className="flex items-center justify-between gap-4">
                <span className="rounded-full bg-brand/10 px-4 py-2 text-sm font-semibold text-brand">{time}</span>
                <span className="text-sm text-muted-ui-foreground">{age}</span>
              </div>
              <h3 className="mt-5 font-heading text-2xl font-semibold text-brand">
                {activity}
              </h3>
              <p className="mt-3 text-muted-ui-foreground">{details}</p>
              <p className="mt-auto pt-5 text-sm font-medium text-accent-ui-foreground">Возраст: {age}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="bg-panel py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="text-center">
            <p className="text-sm font-semibold tracking-widest text-brand uppercase">
              Для семей с детьми
            </p>
            <h2 className="mt-4 font-heading text-4xl font-semibold sm:text-5xl">
              Детские услуги
            </h2>
          </div>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {kidsServices.map((service) => (
              <article
                className="flex h-full flex-col overflow-hidden rounded-3xl bg-page"
                key={service.title}
              >
                <img
                  alt={service.title}
                  className="h-64 w-full object-cover"
                  src={service.image}
                />
                <div className="flex flex-1 flex-col p-7">
                  <h3 className="font-heading text-3xl font-semibold text-brand">
                    {service.title}
                  </h3>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {service.tags.map((tag) => (
                      <span
                        className="rounded-full bg-brand/10 px-3 py-2 text-sm text-brand"
                        key={tag}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p className="mt-auto pt-6 text-lg font-semibold text-accent-ui-foreground">
                    Стоимость: {service.price}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-sm font-semibold text-brand">Для активного отдыха</p>
            <h2 className="mt-4 font-heading text-4xl font-semibold sm:text-5xl">Прокат оборудования</h2>
            <p className="mt-5 text-lg leading-8 text-muted-ui-foreground">Берите всё необходимое для прогулок, спорта и семейных игр прямо на территории комплекса — от велосипедов и SUP-бордов до зимнего инвентаря и настольных развлечений.</p>
          </div>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {equipment.map((group) => (
              <article
                className="rounded-3xl bg-panel p-7"
                key={group.title}
              >
                <h3 className="font-heading text-3xl font-semibold text-brand">
                  {group.title}
                </h3>
                <p className="mt-4 leading-7 text-muted-ui-foreground">{group.description}</p>
                <ul className="mt-6 space-y-4">
                  {group.items.map((item) => (
                    <li className="flex items-center gap-3 rounded-2xl bg-page px-4 py-3" key={item}>
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand/10 text-brand"><Check className="size-4" /></span> {item}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
};
