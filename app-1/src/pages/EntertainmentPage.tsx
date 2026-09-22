import entertainmentHeroImage from "@/assets/alsma/entertainment-hero-new.webp";
import { CatalogSections } from "@/components/site/CatalogSections";
import { HorizontalCarousel } from "@/components/site/HorizontalCarousel";
import { PublicHero } from "@/components/site/PublicHero";
import { SiteHeader } from "@/components/site/SiteHeader";
import { getSiteCollection } from "@/lib/site/content-collections";
import {
  ACTIVE_ZONES,
  ANIMATION_PROGRAM,
  type AnimationProgram,
  KIDS_SERVICES,
  type KidsService,
  SEASONS,
  type SeasonalActivity,
} from "@/lib/site/entertainment";
import { normalizeAnimationProgram } from "@/lib/site/entertainment-content";
import { resolveMediaUrl } from "@/lib/site/media-url";
import { PUBLIC_PAGES } from "@/lib/site/public-pages";
import { usePublishedSiteContent } from "@/lib/site/useSiteContent";

type KidsServiceWithDescription = KidsService & {
  readonly description?: string;
};

export const EntertainmentPage = () => {
  const page = PUBLIC_PAGES.entertainment;
  const content = usePublishedSiteContent("entertainment");
  const hero = content.data?.items?.find(
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
  const seasons = getSiteCollection<SeasonalActivity>(
    content.data?.items,
    "seasonal-slides",
    SEASONS,
  )
    .filter((item) => item.isActive !== false)
    .sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0));
  const programs = getSiteCollection<AnimationProgram | readonly string[]>(
    content.data?.items,
    "animation-programs",
    ANIMATION_PROGRAM,
  )
    .map(normalizeAnimationProgram)
    .filter((item) => item.isActive !== false)
    .sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0));
  const kidsServices = getSiteCollection<KidsServiceWithDescription>(
    content.data?.items,
    "kids-services",
    KIDS_SERVICES,
  )
    .filter((item) => item.isActive !== false)
    .sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0));

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
      <section
        className="mx-auto max-w-[100rem] px-5 py-24 sm:px-8"
        id="details"
      >
        <div className="text-center">
          <p className="text-sm font-semibold tracking-widest text-brand uppercase">
            На территории комплекса
          </p>
          <h2 className="mt-4 font-heading text-4xl font-semibold sm:text-5xl">
            Территория для активного отдыха
          </h2>
          <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-muted-ui-foreground">
            Находите на свежем воздухе среди величественных сосен.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {zones.map((zone) => (
            <article
              className="overflow-hidden rounded-4xl bg-brand-foreground"
              key={zone.title}
            >
              <img
                alt={zone.title}
                className="aspect-[16/9] w-full object-cover"
                src={resolveMediaUrl(zone.image)}
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
      <CatalogSections afterBlock={1} page="entertainment" />
      <section className="py-20">
        <div className="mx-auto max-w-[100rem] px-5 sm:px-8">
          <div className="text-center">
            <p className="text-sm font-semibold text-brand">Круглый год</p>
            <h2 className="mt-4 font-heading text-4xl font-semibold sm:text-5xl">
              Сезонные активности
            </h2>
            <p className="mt-5 text-lg text-muted-ui-foreground">
              Развлечения на свежем воздухе круглый год
            </p>
          </div>
          <HorizontalCarousel
            className="mt-10"
            controlsInside
            slideClassName="basis-full"
          >
            {seasons.map((season) => (
              <article
                className="overflow-hidden rounded-4xl bg-panel text-page-foreground lg:relative lg:min-h-[44rem] lg:bg-transparent lg:text-brand-foreground"
                key={season.label}
              >
                <img
                  alt={season.title}
                  className="aspect-[4/3] w-full object-cover lg:absolute lg:inset-0 lg:aspect-auto lg:size-full"
                  src={resolveMediaUrl(season.image)}
                />
                <div className="hidden lg:absolute lg:inset-0 lg:block lg:bg-gradient-to-t lg:from-page-foreground/90 lg:via-page-foreground/35 lg:to-transparent" />
                <div className="px-9 py-5 sm:p-8 lg:absolute lg:inset-x-0 lg:bottom-0 lg:p-14">
                  <div className="p-0 sm:p-7 lg:max-w-3xl lg:rounded-3xl lg:bg-page-foreground/30 lg:backdrop-blur-sm">
                    <span className="rounded-full bg-brand-foreground px-4 py-2 text-sm font-semibold text-brand lg:bg-panel">
                      {season.label}
                    </span>
                    <h3 className="mt-5 font-heading text-4xl font-semibold">
                      {season.title}
                    </h3>
                    <p className="mt-3 text-muted-ui-foreground lg:text-brand-foreground/80">
                      {season.description}
                    </p>
                    <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                      {season.items.map((item) => (
                        <li
                          className="rounded-xl bg-brand-foreground px-4 py-3 backdrop-blur lg:bg-brand-foreground/10"
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
      <CatalogSections afterBlock={2} page="entertainment" />
      <section className="mx-auto max-w-[100rem] px-5 py-20 sm:px-8">
        <div className="text-center">
          <p className="text-sm font-semibold text-brand">Каждый день</p>
          <h2 className="mt-4 font-heading text-4xl font-semibold sm:text-5xl">
            Программа анимации
          </h2>
          <p className="mt-5 text-lg text-muted-ui-foreground">
            Ежедневная развлекательная программа
          </p>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {programs.map((program) => (
            <article
              className="flex min-h-56 flex-col rounded-3xl bg-panel p-6"
              key={program.title}
            >
              <div className="flex items-center justify-between gap-4">
                <span className="rounded-full bg-brand/10 px-4 py-2 text-sm font-semibold text-brand">
                  {program.time}
                </span>
                <span className="text-sm text-muted-ui-foreground">
                  {program.age}
                </span>
              </div>
              <h3 className="mt-5 font-heading text-2xl font-semibold text-brand">
                {program.title}
              </h3>
              <p className="mt-3 text-muted-ui-foreground">
                {program.description}
              </p>
              <p className="mt-auto pt-5 text-sm font-medium text-accent-ui-foreground">
                Возраст: {program.age}
              </p>
            </article>
          ))}
        </div>
      </section>
      <CatalogSections afterBlock={3} page="entertainment" />
      <section className="bg-panel py-20">
        <div className="mx-auto max-w-[100rem] px-5 sm:px-8">
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
                className="flex h-full flex-col overflow-hidden rounded-3xl bg-brand-foreground"
                key={service.title}
              >
                <img
                  alt={service.title}
                  className="h-64 w-full object-cover"
                  src={resolveMediaUrl(service.image)}
                />
                <div className="flex flex-1 flex-col p-7">
                  <h3 className="font-heading text-3xl font-semibold text-brand">
                    {service.title}
                  </h3>
                  {service.description && (
                    <p className="mt-3 leading-7 text-muted-ui-foreground">
                      {service.description}
                    </p>
                  )}
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
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
      <CatalogSections afterBlock={4} fallback page="entertainment" />
    </main>
  );
};
