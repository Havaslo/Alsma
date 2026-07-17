import { SiteHeroMedia } from "@/components/site/SiteHeroMedia";

type PublicHeroProps = {
  readonly badge?: string;
  readonly description: string;
  readonly eyebrow: string;
  readonly image: string;
  readonly title: string;
};

export const PublicHero = ({
  badge,
  description,
  eyebrow,
  image,
  title,
}: PublicHeroProps) => (
  <section className="relative overflow-hidden text-brand-foreground">
    <SiteHeroMedia
      className="absolute inset-0 size-full object-cover"
      source={image}
    />
    <div className="absolute inset-0 bg-gradient-to-b from-page-foreground/20 via-page-foreground/30 to-page-foreground/85" />
    <div className="relative mx-auto w-full max-w-7xl px-5 pt-32 pb-16 text-center sm:px-8 lg:pt-36 lg:pb-20">
      <p className="text-sm font-bold tracking-widest text-brand-foreground/75 uppercase">
        {eyebrow}
      </p>
      <h1 className="mx-auto mt-4 max-w-4xl font-heading text-5xl leading-tight font-semibold sm:text-6xl">
        {title}
      </h1>
      {badge && (
        <div className="mt-6">
          <span className="inline-flex rounded-full bg-panel px-6 py-2.5 text-sm font-semibold tracking-widest text-brand uppercase shadow-lg">{badge}</span>
        </div>
      )}
      <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-brand-foreground/85">
        {description}
      </p>
    </div>
  </section>
);
