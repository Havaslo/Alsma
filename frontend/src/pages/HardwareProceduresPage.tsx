import { Clock, RussianRuble } from "lucide-react";

import heroImage from "@/assets/alsma/spa-hero-new.jpg";
import { LeadRequestForm } from "@/components/site/LeadRequestForm";
import { PublicHero } from "@/components/site/PublicHero";
import { SiteHeader } from "@/components/site/SiteHeader";
import { HARDWARE_PROCEDURES } from "@/lib/site/hardware-procedures";
import { PUBLIC_PAGES } from "@/lib/site/public-pages";
import { usePublishedSiteContent } from "@/lib/site/useSiteContent";

export const HardwareProceduresPage = () => {
  const page = PUBLIC_PAGES["hardware-procedures"];
  const content = usePublishedSiteContent("hardware-procedures");
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
        eyebrow="Wellness & recovery"
        image={typeof hero?.image === "string" ? hero.image : heroImage}
        title={title}
      />
      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8" id="details">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold tracking-widest text-brand uppercase">
            Аппаратные процедуры
          </p>
          <h2 className="mt-4 font-heading text-4xl font-semibold sm:text-5xl">
            Формат восстановления под ваш запрос
          </h2>
          <p className="mt-5 text-lg leading-8 text-muted-ui-foreground">
            Сравните назначение, длительность и стоимость современных процедур.
          </p>
        </div>
        <div className="mt-12 grid gap-7 md:grid-cols-2 xl:grid-cols-3">
          {HARDWARE_PROCEDURES.map((procedure) => (
            <article
              className="flex overflow-hidden rounded-4xl border border-line bg-panel"
              key={procedure.title}
            >
              <div className="flex w-full flex-col">
                <img
                  alt={procedure.title}
                  className="h-72 w-full object-cover"
                  src={procedure.image}
                />
                <div className="flex flex-1 flex-col p-7">
                  <p className="text-sm font-semibold text-brand">
                    {procedure.accent}
                  </p>
                  <h3 className="mt-3 font-heading text-3xl font-semibold">
                    {procedure.title}
                  </h3>
                  <p className="mt-4 leading-7 text-muted-ui-foreground">
                    {procedure.description}
                  </p>
                  <div className="mt-auto grid grid-cols-2 gap-3 pt-7">
                    <div className="flex items-center gap-3 rounded-2xl bg-brand/10 p-4">
                      <Clock className="size-5 shrink-0 text-brand" />
                      <p className="font-semibold">{procedure.duration}</p>
                    </div>
                    <div className="flex items-center gap-3 rounded-2xl bg-brand/10 p-4">
                      <RussianRuble className="size-5 shrink-0 text-brand" />
                      <p className="font-semibold">{procedure.price}</p>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="bg-brand py-20 text-brand-foreground">
        <div className="mx-auto max-w-5xl px-5 sm:px-8">
          <h2 className="font-heading text-4xl font-semibold sm:text-5xl">
            Записаться на процедуру
          </h2>
          <p className="mt-4 mb-8 text-lg text-brand-foreground/75">
            Специалист поможет подобрать методику и удобное время сеанса.
          </p>
          <LeadRequestForm
            formCode="hardware-procedure-request"
            formTitle="Запись на аппаратную процедуру"
            sourcePage="hardware-procedures"
          />
        </div>
      </section>
    </main>
  );
};
