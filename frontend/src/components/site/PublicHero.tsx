import { ArrowDown } from "lucide-react";

import { SiteHeroMedia } from "@/components/site/SiteHeroMedia";

type PublicHeroProps = {
  readonly description: string;
  readonly eyebrow: string;
  readonly image: string;
  readonly title: string;
};

export const PublicHero = ({
  description,
  eyebrow,
  image,
  title,
}: PublicHeroProps) => (
  <section className="relative flex min-h-[78vh] items-end overflow-hidden text-brand-foreground">
    <SiteHeroMedia
      className="absolute inset-0 size-full object-cover"
      source={image}
    />
    <div className="absolute inset-0 bg-gradient-to-b from-page-foreground/20 via-page-foreground/30 to-page-foreground/85" />
    <div className="relative mx-auto w-full max-w-7xl px-5 pt-40 pb-20 text-center sm:px-8">
      <p className="text-sm font-bold tracking-widest text-brand-foreground/75 uppercase">
        {eyebrow}
      </p>
      <h1 className="mx-auto mt-4 max-w-4xl font-heading text-5xl leading-tight font-semibold sm:text-6xl">
        {title}
      </h1>
      <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-brand-foreground/85">
        {description}
      </p>
      <a
        className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand px-7 py-4 font-semibold text-brand-foreground"
        href="#details"
      >
        Смотреть варианты <ArrowDown className="size-4" />
      </a>
    </div>
  </section>
);
