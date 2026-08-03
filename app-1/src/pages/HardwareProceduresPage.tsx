import { useState } from "react";

import heroImage from "@/assets/alsma/hardware-procedures-hero.webp";
import { PublicHero } from "@/components/site/PublicHero";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SpaRequestModal } from "@/components/site/SpaRequestModal";
import { Button } from "@/components/ui/Button";
import { HARDWARE_PROCEDURES } from "@/lib/site/hardware-procedures";
import { PUBLIC_PAGES } from "@/lib/site/public-pages";
import { usePublishedSiteContent } from "@/lib/site/useSiteContent";

export const HardwareProceduresPage = () => {
  const [selectedProcedure, setSelectedProcedure] = useState<string | null>(
    null,
  );
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
      <section
        className="mx-auto max-w-[100rem] px-5 py-24 sm:px-8"
        id="details"
      >
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold tracking-widest text-brand uppercase">
            Аппаратные процедуры
          </p>
          <h2 className="mt-4 font-heading text-4xl font-semibold sm:text-5xl">
            Глубокое восстановление с помощью современных технологий
          </h2>
          <p className="mt-5 text-lg leading-8 text-muted-ui-foreground">
            Современные аппаратные методики помогают расслабить тело, улучшить
            самочувствие и вернуть ощущение лёгкости. Технологичный уход в
            сочетании с профессиональной заботой дарит заметный результат и
            полноценное восстановление.
          </p>
        </div>
        <div className="mt-12 grid gap-7 md:grid-cols-2 xl:grid-cols-3">
          {HARDWARE_PROCEDURES.map((procedure) => (
            <article
              className="flex overflow-hidden rounded-3xl bg-brand-foreground"
              key={procedure.title}
            >
              <div className="flex w-full flex-col">
                <img
                  alt={procedure.title}
                  className="aspect-video w-full object-cover"
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
                  <div className="mt-7 mb-7 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-page p-4">
                      <p className="text-xs text-muted-ui-foreground">
                        Длительность
                      </p>
                      <p className="font-semibold">{procedure.duration}</p>
                    </div>
                    <div className="rounded-2xl bg-page p-4">
                      <p className="text-xs text-muted-ui-foreground">
                        Стоимость
                      </p>
                      <p className="font-semibold">{procedure.price}</p>
                    </div>
                  </div>
                  <Button
                    className="mt-auto w-full rounded-full"
                    onClick={() => setSelectedProcedure(procedure.title)}
                  >
                    Записаться на процедуру
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <SpaRequestModal
        formCode="hardware-procedure-request"
        onClose={() => setSelectedProcedure(null)}
        open={selectedProcedure !== null}
        procedureName={selectedProcedure ?? undefined}
        sourcePage="hardware-procedures"
      />
    </main>
  );
};
