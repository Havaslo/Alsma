import { Check } from "lucide-react";

import spaHeroImage from "@/assets/alsma/spa-hero-new.jpg";
import { PublicHero } from "@/components/site/PublicHero";
import { SiteHeader } from "@/components/site/SiteHeader";
import {
  SpaCeremoniesSection,
  SpaCompanySection,
  SpaInformationSections,
  SpaMembershipSection,
  SpaPromotionsSection,
} from "@/components/site/SpaAdditionalSections";
import { SpaRequestForm } from "@/components/site/SpaRequestForm";
import { PUBLIC_PAGES } from "@/lib/site/public-pages";
import { MASSAGES, SPA_SPACES, WATER_PROCEDURES } from "@/lib/site/spa";
import { usePublishedSiteContent } from "@/lib/site/useSiteContent";

export const SpaPage = () => {
  const page = PUBLIC_PAGES.spa;
  const content = usePublishedSiteContent("spa");
  const hero = content.data?.items.find(
    (item) => item.itemKey === "hero",
  )?.content;
  const title =
    typeof hero?.title === "string" ? hero.title : "SPA и процедуры";
  const description =
    typeof hero?.description === "string" ? hero.description : page.description;

  return (
    <main className="min-h-screen bg-page text-page-foreground">
      <SiteHeader />
      <PublicHero
        description={description}
        eyebrow="SPA-центр"
        image={typeof hero?.image === "string" ? hero.image : spaHeroImage}
        title={title}
      />
      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8" id="details">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-heading text-4xl font-semibold sm:text-5xl">
            Локации SPA-центра
          </h2>
          <p className="mt-5 text-lg text-muted-ui-foreground">
            Современные пространства для комфорта, релаксации и восстановления.
          </p>
        </div>
        <div className="mt-14 space-y-10">
          {SPA_SPACES.map((space, index) => (
            <article
              className="overflow-hidden rounded-4xl bg-panel shadow-lg lg:grid lg:grid-cols-2"
              key={space.title}
            >
              <img
                alt={space.title}
                className={`aspect-[4/3] size-full object-cover ${index % 2 ? "lg:order-2" : ""}`}
                src={space.image}
              />
              <div className="flex flex-col p-8 sm:p-12">
                <p className="text-sm font-semibold tracking-widest text-brand uppercase">
                  SPA-пространство
                </p>
                <h3 className="mt-4 font-heading text-4xl font-semibold">
                  {space.title}
                </h3>
                <p className="mt-5 leading-7 text-muted-ui-foreground">
                  {space.description}
                </p>
                <ul className="mt-7 space-y-3">
                  {space.features.map((feature) => (
                    <li className="flex gap-3" key={feature}>
                      <Check className="mt-1 size-4 shrink-0 text-brand" />{" "}
                      {feature}
                    </li>
                  ))}
                </ul>
                <a
                  className="mt-8 inline-flex w-fit items-center justify-center rounded-full bg-brand px-7 py-3.5 text-sm font-semibold text-brand-foreground"
                  href="#spa-cta"
                >
                  Записаться
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>
      <SpaMembershipSection />
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-heading text-4xl font-semibold sm:text-5xl">
              Массажные процедуры
            </h2>
            <p className="mt-5 text-lg text-muted-ui-foreground">
              Полный перечень массажей с длительностью и стоимостью.
            </p>
          </div>
          <div className="mt-14 overflow-hidden rounded-3xl bg-panel">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left">
                <thead>
                  <tr className="bg-muted-ui/50 text-sm font-semibold tracking-widest text-muted-ui-foreground uppercase">
                    <th className="px-7 py-4">Процедура</th>
                    <th className="px-7 py-4">Длительность</th>
                    <th className="px-7 py-4">Стоимость</th>
                  </tr>
                </thead>
                <tbody>
                  {MASSAGES.map(([name, duration, price]) => (
                    <tr
                      className="border-t border-line"
                      key={`${name}:${duration}`}
                    >
                      <td className="px-7 py-4 text-lg font-semibold">
                        {name}
                      </td>
                      <td className="px-7 py-4 text-lg text-muted-ui-foreground">
                        {duration}
                      </td>
                      <td className="px-7 py-4 text-lg font-semibold">
                        {price}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
        <div className="text-center">
          <p className="text-sm font-semibold tracking-widest text-brand uppercase">
            Минеральное восстановление
          </p>
          <h2 className="mt-4 font-heading text-4xl font-semibold sm:text-5xl">
            Водные процедуры и бальнеотерапия
          </h2>
        </div>
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {WATER_PROCEDURES.map((group) => (
            <article
              className="overflow-hidden rounded-3xl bg-panel"
              key={group.title}
            >
              <img
                alt={group.title}
                className="h-56 w-full object-cover"
                src={group.image}
              />
              <div className="p-7">
                <h3 className="font-heading text-2xl font-semibold text-brand sm:text-3xl">
                  {group.title}
                </h3>
                <ul className="mt-6 space-y-3">
                  {group.items.map((item) => (
                    <li
                      className="flex gap-3 rounded-2xl bg-page px-4 py-3"
                      key={item}
                    >
                      <Check className="mt-1 size-4 shrink-0 text-brand" />{" "}
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>
      <SpaCeremoniesSection />
      <SpaCompanySection />
      <SpaPromotionsSection />
      <section className="bg-brand py-20 text-brand-foreground" id="spa-cta">
        <div className="mx-auto max-w-5xl px-5 sm:px-8">
          <h2 className="font-heading text-4xl font-semibold sm:text-5xl">
            Готовы к перезагрузке?
          </h2>
          <p className="mt-4 mb-8 text-lg text-brand-foreground/75">
            Оставьте контакты — специалист поможет подобрать процедуру и время.
          </p>
          <SpaRequestForm />
        </div>
      </section>
      <SpaInformationSections />
    </main>
  );
};
