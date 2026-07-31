import { Check, PartyPopper, Umbrella, Utensils, Waves } from "lucide-react";

import heroImage from "@/assets/alsma/all-inclusive-hero.webp";
import { AllInclusiveFinalSection } from "@/components/site/AllInclusiveSupportSections";
import { PublicHero } from "@/components/site/PublicHero";
import { SiteHeader } from "@/components/site/SiteHeader";
import {
  BAR_DETAILS,
  FEATURED_FORMATS,
  FOOD_FORMATS,
  INCLUSIVE_OVERVIEW,
  SPA_DETAILS,
} from "@/lib/site/all-inclusive";
import { PUBLIC_PAGES } from "@/lib/site/public-pages";
import { usePublishedSiteContent } from "@/lib/site/useSiteContent";

const overviewIcons = {
  SPA: Waves,
  Анимация: PartyPopper,
  Питание: Utensils,
  Пляж: Umbrella,
} as const;

export const AllInclusivePage = () => {
  const page = PUBLIC_PAGES["all-inclusive"];
  const content = usePublishedSiteContent("all-inclusive");
  const hero = content.data?.items.find(
    (item) => item.itemKey === "hero",
  )?.content;
  const title = typeof hero?.title === "string" ? hero.title : page.title;
  const description =
    typeof hero?.description === "string" ? hero.description : page.description;

  return (
    <main className="min-h-screen bg-page text-page-foreground">
      <SiteHeader />
      <PublicHero
        description={description}
        eyebrow="Всё включено"
        image={typeof hero?.image === "string" ? hero.image : heroImage}
        title={title}
      />
      <section
        className="mx-auto max-w-[100rem] px-5 py-10 sm:px-8 sm:py-24"
        id="details"
      >
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-heading text-4xl font-semibold sm:text-5xl">
            Что входит в концепцию «Всё включено»
          </h2>
          <p className="mt-5 text-lg leading-8 text-muted-ui-foreground">
            Основные форматы отдыха собраны в одной понятной системе, чтобы вы
            могли просто наслаждаться временем в отеле.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {INCLUSIVE_OVERVIEW.map((item) => {
            const Icon = overviewIcons[item.title];
            return (
              <article
                className="rounded-3xl bg-brand-foreground p-7"
                key={item.title}
              >
                <span className="grid size-12 place-items-center rounded-2xl bg-brand/10 text-brand">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-6 font-heading text-2xl font-semibold">
                  {item.title}
                </h3>
                <p className="mt-4 leading-7 text-muted-ui-foreground">
                  {item.description}
                </p>
              </article>
            );
          })}
        </div>
      </section>
      <section className="py-10 sm:py-24">
        <div className="mx-auto max-w-[100rem] px-5 sm:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-heading text-4xl font-semibold sm:text-5xl">
              Что входит в питание
            </h2>
            <p className="mt-5 text-lg leading-8 text-muted-ui-foreground">
              Три основных приёма пищи и лёгкие перекусы в течение дня — всё,
              чтобы отдыхать без забот о том, где и что поесть.
            </p>
          </div>
          <div className="mt-12 grid gap-7 lg:grid-cols-2">
            {FOOD_FORMATS.map((format) => (
              <article
                className="overflow-hidden rounded-4xl bg-brand-foreground"
                key={format.title}
              >
                <img
                  alt={format.title}
                  className="aspect-video w-full object-cover"
                  src={format.image}
                />
                <div className="p-8">
                  <p className="text-sm font-semibold tracking-widest text-brand uppercase">
                    {format.eyebrow}
                  </p>
                  <h3 className="mt-4 font-heading text-3xl font-semibold">
                    {format.title}
                  </h3>
                  <ul className="mt-6 space-y-4">
                    {format.items.map((item) => (
                      <li className="flex gap-3" key={item}>
                        <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-accent-ui" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="px-5 pb-12 sm:px-8">
        <div className="mx-auto max-w-[100rem]">
          <FeatureSplit format={FEATURED_FORMATS[0]} />
        </div>
      </section>
      <DetailShowcase
        details={SPA_DETAILS}
        eyebrow="SPA-зона"
        format={FEATURED_FORMATS[1]}
      />
      <DetailShowcase
        details={BAR_DETAILS}
        eyebrow="Вечерний бар"
        format={FEATURED_FORMATS[2]}
      />
      <section className="mx-auto max-w-[100rem] px-5 py-10 sm:px-8 sm:py-20">
        <FeatureSplit format={FEATURED_FORMATS[3]} reverse />
      </section>
      <AllInclusiveFinalSection />
    </main>
  );
};

type FeaturedFormat = (typeof FEATURED_FORMATS)[number];

const FeatureSplit = ({
  format,
  reverse = false,
}: {
  format: FeaturedFormat;
  reverse?: boolean;
}) => (
  <article className="overflow-hidden rounded-4xl bg-brand-foreground lg:grid lg:grid-cols-2">
    <img
      alt={format.title}
      className={`aspect-[4/3] w-full object-cover lg:aspect-auto lg:h-full ${reverse ? "lg:order-2" : ""}`}
      src={format.image}
    />
    <div className="flex flex-col justify-center p-8 sm:p-12">
      <h2 className="font-heading text-4xl font-semibold sm:text-5xl">
        {format.title}
      </h2>
      <p className="mt-6 leading-7 text-muted-ui-foreground">
        {format.description}
      </p>
      <ul className="mt-8 space-y-4">
        {format.items.map((item) => (
          <li className="flex gap-3" key={item}>
            <Check className="mt-1 size-4 shrink-0 text-brand" /> {item}
          </li>
        ))}
      </ul>
    </div>
  </article>
);

const DetailShowcase = ({
  details,
  eyebrow,
  format,
}: {
  details: readonly (readonly [string, string])[];
  eyebrow: string;
  format: FeaturedFormat;
}) => (
  <section className="px-5 py-10 sm:px-8 sm:py-20">
    <div className="mx-auto max-w-[100rem]">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-semibold tracking-widest text-brand uppercase">
          {eyebrow}
        </p>
        <h2 className="mt-4 font-heading text-4xl font-semibold sm:text-5xl">
          {format.title}
        </h2>
        <p className="mt-5 text-lg leading-8 text-muted-ui-foreground">
          {format.description}
        </p>
      </div>
      <div className="mt-14 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <img
          alt={format.title}
          className="size-full min-h-[34rem] rounded-4xl object-cover"
          src={format.image}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          {details.map(([title, description], index) => (
            <article
              className="rounded-3xl bg-brand-foreground p-7"
              key={title}
            >
              <p className="text-sm text-brand">0{index + 1}</p>
              <h3 className="mt-4 font-heading text-2xl font-semibold">
                {title}
              </h3>
              <p className="mt-4 leading-7 text-muted-ui-foreground">
                {description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </div>
  </section>
);
