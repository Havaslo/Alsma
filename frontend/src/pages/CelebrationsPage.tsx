import { Check, Users } from "lucide-react";

import heroImage from "@/assets/alsma/spa-river-aerial.jpg";
import { LeadRequestForm } from "@/components/site/LeadRequestForm";
import { PublicHero } from "@/components/site/PublicHero";
import { SiteHeader } from "@/components/site/SiteHeader";
import { EVENT_FORMATS, EVENT_GALLERY } from "@/lib/site/celebrations";
import { PUBLIC_PAGES } from "@/lib/site/public-pages";
import { usePublishedSiteContent } from "@/lib/site/useSiteContent";

export const CelebrationsPage = () => {
  const page = PUBLIC_PAGES.celebrations;
  const content = usePublishedSiteContent("celebrations");
  const hero = content.data?.items.find(
    (item) => item.itemKey === "hero",
  )?.content;
  const title =
    typeof hero?.title === "string"
      ? hero.title
      : "Торжества и корпоративный отдых";
  const description =
    typeof hero?.description === "string" ? hero.description : page.description;

  return (
    <main className="min-h-screen bg-page text-page-foreground">
      <SiteHeader />
      <PublicHero
        description={description}
        eyebrow="Свадьбы, юбилеи и корпоративные выезды"
        image={typeof hero?.image === "string" ? hero.image : heroImage}
        title={title}
      />
      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8" id="details">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold tracking-widest text-brand uppercase">
            Форматы мероприятий
          </p>
          <h2 className="mt-4 font-heading text-4xl font-semibold sm:text-5xl">
            Сценарий под ваш повод и количество гостей
          </h2>
          <p className="mt-5 text-lg leading-8 text-muted-ui-foreground">
            От частного ужина до двухдневного корпоративного выезда с
            проживанием, wellness-программой и вечерним событием.
          </p>
        </div>
        <div className="mt-12 grid gap-7 lg:grid-cols-3">
          {EVENT_FORMATS.map((event) => (
            <article
              className="overflow-hidden rounded-4xl bg-panel"
              key={event.title}
            >
              <img
                alt={event.title}
                className="h-64 w-full object-cover"
                src={event.image}
              />
              <div className="p-7">
                <h3 className="font-heading text-3xl font-semibold text-brand">
                  {event.title}
                </h3>
                <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand/10 px-4 py-2 text-sm font-semibold text-brand">
                  <Users className="size-4" /> {event.capacity}
                </p>
                <p className="mt-5 leading-7 text-muted-ui-foreground">
                  {event.description}
                </p>
                <ul className="mt-6 space-y-3">
                  {event.details.map((detail) => (
                    <li className="flex gap-3" key={detail}>
                      <Check className="mt-1 size-4 shrink-0 text-brand" />{" "}
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="bg-panel py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="text-center">
            <p className="text-sm font-semibold tracking-widest text-brand uppercase">
              Галерея атмосферы
            </p>
            <h2 className="mt-4 font-heading text-4xl font-semibold sm:text-5xl">
              Локации, блюда и примеры событий
            </h2>
          </div>
          <div className="mt-12 grid gap-7 md:grid-cols-3">
            {EVENT_GALLERY.map((item) => (
              <article
                className="overflow-hidden rounded-3xl bg-page"
                key={item.title}
              >
                <img
                  alt={item.title}
                  className="h-64 w-full object-cover"
                  src={item.image}
                />
                <div className="p-6">
                  <h3 className="font-heading text-2xl font-semibold text-brand">
                    {item.title}
                  </h3>
                  <p className="mt-3 leading-7 text-muted-ui-foreground">
                    {item.description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="bg-brand py-20 text-brand-foreground">
        <div className="mx-auto max-w-5xl px-5 sm:px-8">
          <h2 className="font-heading text-4xl font-semibold sm:text-5xl">
            Обсудим ваш визит
          </h2>
          <p className="mt-4 mb-8 text-lg text-brand-foreground/75">
            Расскажите о событии — мы подготовим сценарий, размещение, питание и
            программу.
          </p>
          <LeadRequestForm
            formCode="celebrations-request"
            formTitle="Заявка на корпоративный отдых"
            showDetails
            sourcePage="celebrations"
          />
        </div>
      </section>
    </main>
  );
};
