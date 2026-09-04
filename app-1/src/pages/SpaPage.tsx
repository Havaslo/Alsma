import { useState } from "react";

import { Check } from "lucide-react";

import spaHeroImage from "@/assets/alsma/spa-hero-new.jpg";
import { CatalogSections } from "@/components/site/CatalogSections";
import { PublicHero } from "@/components/site/PublicHero";
import { SiteHeader } from "@/components/site/SiteHeader";
import {
  SpaInformationSections,
  SpaPromotionsSection,
} from "@/components/site/SpaAdditionalSections";
import { SpaRequestModal } from "@/components/site/SpaRequestModal";
import { resolveMediaUrl } from "@/lib/site/media-url";
import { PUBLIC_PAGES } from "@/lib/site/public-pages";
import { SPA_SPACES } from "@/lib/site/spa";
import { getSpaDefaults } from "@/lib/site/spa-content";
import { usePublishedSiteContent } from "@/lib/site/useSiteContent";

export const SpaPage = () => {
  const [open, setOpen] = useState(false);
  const content = usePublishedSiteContent("spa");
  const spa = getSpaDefaults(content.data?.items);
  const hero = content.data?.items?.find(
    (item) => item.itemKey === "hero",
  )?.content;
  return (
    <main className="spa-page min-h-screen bg-page text-page-foreground">
      <SiteHeader />
      <PublicHero
        description={
          typeof hero?.description === "string"
            ? hero.description
            : PUBLIC_PAGES.spa.description
        }
        eyebrow="SPA-центр"
        image={typeof hero?.image === "string" ? hero.image : spaHeroImage}
        title={typeof hero?.title === "string" ? hero.title : "SPA и процедуры"}
      />
      <section className="mx-auto max-w-[100rem] px-5 py-8 sm:px-8 sm:py-12 lg:py-12">
        <h2 className="text-center font-heading text-4xl font-semibold">
          Локации SPA-центра
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-muted-ui-foreground">
          Термальная зона, бассейн и кабинеты для спокойного восстановления.
        </p>
        <div className="mt-8 grid gap-6 sm:mt-12 lg:grid-cols-2">
          {SPA_SPACES.map((space) => (
            <article
              className="overflow-hidden rounded-4xl bg-panel"
              key={space.title}
            >
              <img
                alt={space.title}
                className="aspect-[16/9] w-full object-cover"
                src={resolveMediaUrl(space.image)}
              />
              <div className="p-7">
                <h3 className="font-heading text-3xl font-semibold">
                  {space.title}
                </h3>
                <p className="mt-4 text-muted-ui-foreground">
                  {space.description}
                </p>
                <ul className="mt-6 space-y-3">
                  {space.features.map((feature) => (
                    <li className="flex gap-3" key={feature}>
                      <Check className="size-4 text-brand" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>
      <CatalogSections afterBlock={1} page="spa" />
      <CatalogSections afterBlock={2} page="spa" />
      <CatalogSections afterBlock={3} page="spa" />
      <SpaPromotionsSection
        items={spa.promotions}
        onOpenRequest={() => setOpen(true)}
      />
      <SpaInformationSections
        additionalServices={spa.additional}
        menu={spa.menu}
      />
      <SpaRequestModal onClose={() => setOpen(false)} open={open} />
      <CatalogSections afterBlock={3} fallback page="spa" />
    </main>
  );
};
