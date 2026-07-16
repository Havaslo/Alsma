import { ArrowRight, Check } from "lucide-react";

import { SiteHeader } from "@/components/site/SiteHeader";
import { PUBLIC_PAGES, type PublicPageKey } from "@/lib/site/public-pages";
import { usePublishedSiteContent } from "@/lib/site/useSiteContent";

export const PublicContentPage = ({
  pageKey,
}: {
  readonly pageKey: PublicPageKey;
}) => {
  const page = PUBLIC_PAGES[pageKey];
  const content = usePublishedSiteContent(pageKey);
  const hero = content.data?.items.find(
    (item) => item.itemKey === "hero",
  )?.content;
  const title = typeof hero?.title === "string" ? hero.title : page.title;
  const description =
    typeof hero?.description === "string" ? hero.description : page.description;
  return (
    <main className="min-h-screen bg-page text-page-foreground">
      <SiteHeader />
      <section className="relative flex min-h-[78vh] items-end overflow-hidden text-brand-foreground">
        <img
          alt={title}
          className="absolute inset-0 size-full object-cover"
          src={page.heroImage}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-page-foreground/20 via-page-foreground/25 to-page-foreground/80" />
        <div className="relative mx-auto w-full max-w-7xl px-5 pt-40 pb-20 sm:px-8">
          <p className="text-sm font-bold tracking-widest text-brand-foreground/75 uppercase">
            {page.eyebrow}
          </p>
          <h1 className="mt-4 max-w-4xl font-heading text-5xl leading-tight font-semibold sm:text-6xl">
            {title}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-brand-foreground/85">
            {description}
          </p>
          <a
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand px-7 py-4 font-semibold text-brand-foreground"
            href="#details"
          >
            Узнать больше <ArrowRight className="size-4" />
          </a>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8" id="details">
        <div className="grid gap-6 md:grid-cols-2">
          {page.highlights.map((item) => (
            <article
              className="rounded-4xl border border-line bg-panel p-8 shadow-lg"
              key={item.title}
            >
              <span className="grid size-12 place-items-center rounded-full bg-brand text-brand-foreground">
                <Check className="size-5" />
              </span>
              <h2 className="mt-6 font-heading text-3xl font-semibold text-brand">
                {item.title}
              </h2>
              <p className="mt-4 text-lg leading-8 text-muted-ui-foreground">
                {item.description}
              </p>
            </article>
          ))}
        </div>
        <div className="mt-12 rounded-4xl bg-brand p-8 text-brand-foreground sm:p-12">
          <h2 className="font-heading text-4xl font-semibold">
            Готовы спланировать отдых?
          </h2>
          <p className="mt-4 max-w-2xl text-brand-foreground/75">
            Оставьте заявку — команда АЛСМА поможет подобрать даты, номер и
            программу отдыха.
          </p>
          <a
            className="mt-7 inline-flex rounded-full bg-panel px-7 py-4 font-semibold text-brand"
            href="tel:+78000000000"
          >
            Связаться с нами
          </a>
        </div>
      </section>
    </main>
  );
};
