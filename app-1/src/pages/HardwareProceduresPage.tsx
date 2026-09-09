import heroImage from "@/assets/alsma/hardware-procedures-hero.webp";
import { CatalogSections } from "@/components/site/CatalogSections";
import { PublicHero } from "@/components/site/PublicHero";
import { QuantumBedFeature } from "@/components/site/QuantumBedFeature";
import { SiteHeader } from "@/components/site/SiteHeader";
import { PUBLIC_PAGES } from "@/lib/site/public-pages";
import { usePublishedSiteContent } from "@/lib/site/useSiteContent";

export const HardwareProceduresPage = () => {
  const page = PUBLIC_PAGES["hardware-procedures"];
  const content = usePublishedSiteContent("hardware-procedures");
  const hero = content.data?.items?.find(
    (item) => item.itemKey === "hero",
  )?.content;
  const title = typeof hero?.title === "string" ? hero.title : page.title;
  const description =
    typeof hero?.description === "string" ? hero.description : page.description;

  return (
    <main className="min-h-screen bg-page text-page-foreground">
      <SiteHeader bookingLabel="Выбрать процедуру" bookingTo="#details" />
      <PublicHero
        description={description}
        eyebrow="Wellness & recovery"
        image={typeof hero?.image === "string" ? hero.image : heroImage}
        title={title}
      />
      <QuantumBedFeature />
      <CatalogSections afterBlock={1} fallback page="hardware-procedures" />
    </main>
  );
};
