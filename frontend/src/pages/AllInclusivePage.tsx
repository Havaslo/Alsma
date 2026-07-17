import { Check, Sparkles } from "lucide-react";

import heroImage from "@/assets/alsma/all-inclusive-hero-new.jpg";
import {
  AllInclusiveAnimationSection,
  AllInclusiveFinalSection,
} from "@/components/site/AllInclusiveSupportSections";
import { PublicHero } from "@/components/site/PublicHero";
import { SiteHeader } from "@/components/site/SiteHeader";
import {
  FEATURED_FORMATS,
  FOOD_FORMATS,
  INCLUSIVE_OVERVIEW,
} from "@/lib/site/all-inclusive";
import { PUBLIC_PAGES } from "@/lib/site/public-pages";
import { usePublishedSiteContent } from "@/lib/site/useSiteContent";

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
      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8" id="details">
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
          {INCLUSIVE_OVERVIEW.map((item) => (
            <article className="rounded-3xl bg-panel p-7" key={item.title}>
              <span className="grid size-12 place-items-center rounded-2xl bg-brand/10 text-brand">
                <Sparkles className="size-5" />
              </span>
              <h3 className="mt-6 font-heading text-2xl font-semibold">
                {item.title}
              </h3>
              <p className="mt-4 leading-7 text-muted-ui-foreground">
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </section>
      <section className="bg-panel py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <h2 className="text-center font-heading text-4xl font-semibold sm:text-5xl">
            Что входит в питание
          </h2>
          <div className="mt-12 grid gap-7 lg:grid-cols-2">
            {FOOD_FORMATS.map((format) => (
              <article
                className="overflow-hidden rounded-4xl bg-page"
                key={format.title}
              >
                <img
                  alt={format.title}
                  className="h-64 w-full object-cover"
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
                        <Check className="mt-1 size-4 shrink-0 text-brand" />{" "}
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl space-y-10 px-5 py-24 sm:px-8">
        {FEATURED_FORMATS.slice(0, 3).map((format, index) => (
          <article
            className="overflow-hidden rounded-4xl bg-panel lg:grid lg:grid-cols-2"
            key={format.title}
          >
            <img
              alt={format.title}
              className={`aspect-[4/3] size-full object-cover ${index % 2 ? "lg:order-2" : ""}`}
              src={format.image}
            />
            <div className="p-8 sm:p-12">
              <h2 className="font-heading text-4xl font-semibold">
                {format.title}
              </h2>
              <p className="mt-5 leading-7 text-muted-ui-foreground">
                {format.description}
              </p>
              <ul className="mt-7 space-y-4">
                {format.items.map((item) => (
                  <li className="flex gap-3" key={item}>
                    <Check className="mt-1 size-4 shrink-0 text-brand" /> {item}
                  </li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </section>
      <AllInclusiveAnimationSection />
      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
        {FEATURED_FORMATS.slice(3).map((format) => (
          <article className="overflow-hidden rounded-4xl bg-panel lg:grid lg:grid-cols-2" key={format.title}>
            <img alt={format.title} className="aspect-[4/3] size-full object-cover" src={format.image} />
            <div className="p-8 sm:p-12">
              <h2 className="font-heading text-4xl font-semibold">{format.title}</h2>
              <p className="mt-5 leading-7 text-muted-ui-foreground">{format.description}</p>
              <ul className="mt-7 space-y-4">{format.items.map((item) => <li className="flex gap-3" key={item}><Check className="mt-1 size-4 shrink-0 text-brand" /> {item}</li>)}</ul>
            </div>
          </article>
        ))}
      </section>
      <AllInclusiveFinalSection />
    </main>
  );
};
