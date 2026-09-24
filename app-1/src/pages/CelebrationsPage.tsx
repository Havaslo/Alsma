import { useState } from "react";

import celebrationsHeroImage from "@/assets/alsma/celebrations-hero.jpg";
import heroImage from "@/assets/alsma/spa-river-aerial.jpg";
import { CatalogSections } from "@/components/site/CatalogSections";
import { LeadRequestModal } from "@/components/site/LeadRequestModal";
import { PublicHero } from "@/components/site/PublicHero";
import { SiteHeader } from "@/components/site/SiteHeader";
import { EVENT_FORMATS, EVENT_GALLERY } from "@/lib/site/celebrations";
import { resolveMediaUrl } from "@/lib/site/media-url";
import { PUBLIC_PAGES } from "@/lib/site/public-pages";
import { usePublishedSiteContent } from "@/lib/site/useSiteContent";

export const CelebrationsPage = () => {
  const [requestOpen, setRequestOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const openEventRequest = (eventTitle: string) => {
    setSelectedEvent(eventTitle);
    setRequestOpen(true);
  };
  const page = PUBLIC_PAGES.celebrations;
  const content = usePublishedSiteContent("celebrations");
  const hero = content.data?.items?.find(
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
        image={
          typeof hero?.image === "string" ? hero.image : celebrationsHeroImage
        }
        title={title}
      />
      <section
        className="mx-auto max-w-[100rem] px-5 py-24 sm:px-8"
        id="details"
      >
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold tracking-widest text-brand uppercase">
            Форматы мероприятий
          </p>
          <h2 className="mt-4 font-heading text-4xl font-semibold sm:text-5xl">
            Подберём сценарий под ваш повод и количество гостей
          </h2>
          <p className="mt-5 text-lg leading-8 text-muted-ui-foreground">
            От частного ужина до двухдневного корпоративного выезда с
            проживанием, wellness-программой и вечерним событием.
          </p>
        </div>
        <div className="mt-12 grid gap-7 lg:grid-cols-3">
          {EVENT_FORMATS.map((event) => (
            <article
              className="group relative w-full cursor-pointer overflow-hidden rounded-4xl border border-line bg-page text-left transition hover:-translate-y-1 hover:border-brand/40 hover:shadow-lg"
              key={event.title}
            >
              <img
                alt={event.title}
                className="h-64 w-full object-cover transition-transform group-hover:scale-[1.02]"
                src={resolveMediaUrl(event.image)}
              />
              <div className="p-7">
                <h3 className="font-heading text-3xl font-semibold text-brand">
                  {event.title}
                </h3>
                <p className="mt-4 inline-flex rounded-full bg-supporting/30 px-4 py-2 text-sm font-semibold text-brand">
                  {event.capacity}
                </p>
                <p className="mt-5 leading-7 text-muted-ui-foreground">
                  {event.description}
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  {event.details.map((detail) => (
                    <span
                      className="rounded-full bg-panel px-4 py-2 text-sm font-medium"
                      key={detail}
                    >
                      {detail}
                    </span>
                  ))}
                </div>
              </div>
              <button
                aria-label={`Обсудить формат: ${event.title}`}
                className="absolute inset-0 cursor-pointer rounded-4xl focus-visible:ring-4 focus-visible:ring-focus/50 focus-visible:outline-none"
                onClick={() => openEventRequest(event.title)}
                type="button"
              />
            </article>
          ))}
        </div>
      </section>
      <CatalogSections afterBlock={1} page="celebrations" />
      <section className="mx-auto max-w-[100rem] px-5 pb-24 sm:px-8">
        <div className="relative overflow-hidden rounded-4xl px-6 py-12 text-center text-brand-foreground sm:px-10">
          <img
            alt=""
            aria-hidden="true"
            className="absolute inset-0 size-full object-cover"
            src={heroImage}
          />
          <div className="absolute inset-0 bg-page-foreground/60" />
          <div className="relative mx-auto max-w-4xl">
            <p className="text-sm font-semibold tracking-widest uppercase opacity-75">
              Обсудим ваш формат
            </p>
            <h2 className="mt-4 font-heading text-4xl font-semibold sm:text-5xl">
              Планируете корпоративный отдых?
            </h2>
            <p className="mt-6 text-lg leading-8 opacity-85">
              Свяжитесь с нами, и мы поможем продумать сценарий выезда:
              проживание, питание, программу, активности и комфортное размещение
              команды.
            </p>
            <button
              className="mt-8 rounded-full bg-brand px-8 py-4 font-semibold text-brand-foreground"
              onClick={() => {
                setSelectedEvent(null);
                setRequestOpen(true);
              }}
              type="button"
            >
              Подробнее
            </button>
          </div>
        </div>
      </section>
      <CatalogSections afterBlock={2} page="celebrations" />
      <section className="bg-panel py-24">
        <div className="mx-auto max-w-[100rem] px-5 sm:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-sm font-semibold tracking-widest text-brand uppercase">
              Локации для мероприятий
            </p>
            <h2 className="mt-4 font-heading text-4xl font-semibold sm:text-5xl">
              Пространства для торжеств и встреч
            </h2>
            <p className="mt-5 text-lg leading-8 text-muted-ui-foreground">
              Выберите подходящую площадку для свадьбы, праздника, конференции
              или отдыха на природе.
            </p>
          </div>
          <div className="mt-12 grid gap-7 md:grid-cols-3">
            {EVENT_GALLERY.map((item) => (
              <article
                className="overflow-hidden rounded-3xl border border-line bg-page"
                key={item.title}
              >
                <img
                  alt={item.title}
                  className="h-64 w-full object-cover"
                  src={resolveMediaUrl(item.image)}
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
      <LeadRequestModal
        commentPlaceholder="Напишите желаемую дату, количество гостей и ваши пожелания"
        contextText={selectedEvent ? `Вы выбрали: ${selectedEvent}` : undefined}
        description={
          selectedEvent
            ? `Оставьте контакты, и мы свяжемся с вами, чтобы обсудить формат «${selectedEvent}», желаемую дату и количество гостей, а также помочь с организацией.`
            : "Оставьте контакты, и мы свяжемся с вами, чтобы обсудить корпоративный отдых, количество гостей, формат программы и подобрать подходящее решение."
        }
        emailRequired
        eyebrow={
          selectedEvent
            ? "Обсуждение мероприятия"
            : "Заявка на корпоративный отдых"
        }
        formCode="celebrations-request"
        formTitle={
          selectedEvent
            ? `Заявка: ${selectedEvent}`
            : "Заявка на корпоративный отдых"
        }
        nameRequired
        onClose={() => {
          setRequestOpen(false);
          setSelectedEvent(null);
        }}
        open={requestOpen}
        sourcePage="celebrations"
        title="Обсудим ваш визит"
      />
      <CatalogSections afterBlock={2} fallback page="celebrations" />
    </main>
  );
};
