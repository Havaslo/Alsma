import { useState } from "react";

import heroImage from "@/assets/alsma/spa-river-aerial.jpg";
import { LeadRequestForm } from "@/components/site/LeadRequestForm";
import { PublicHero } from "@/components/site/PublicHero";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Modal } from "@/components/ui/Modal";
import { EVENT_FORMATS, EVENT_GALLERY } from "@/lib/site/celebrations";
import { PUBLIC_PAGES } from "@/lib/site/public-pages";
import { usePublishedSiteContent } from "@/lib/site/useSiteContent";

export const CelebrationsPage = () => {
  const [requestOpen, setRequestOpen] = useState(false);
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
      <section
        className="mx-auto max-w-screen-2xl px-5 py-24 sm:px-8"
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
              className="overflow-hidden rounded-4xl border border-line bg-page"
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
            </article>
          ))}
        </div>
      </section>
      <section className="mx-auto max-w-screen-2xl px-5 pb-24 sm:px-8">
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
              onClick={() => setRequestOpen(true)}
              type="button"
            >
              Подробнее
            </button>
          </div>
        </div>
      </section>
      <section className="bg-panel py-24">
        <div className="mx-auto max-w-screen-2xl px-5 sm:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-sm font-semibold tracking-widest text-brand uppercase">
              Галерея атмосферы
            </p>
            <h2 className="mt-4 font-heading text-4xl font-semibold sm:text-5xl">
              Локации, блюда и примеры событий
            </h2>
            <p className="mt-5 text-lg leading-8 text-muted-ui-foreground">
              Подобрали визуальные акценты, которые помогают представить формат
              будущего торжества или корпоративного отдыха.
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
      <Modal
        closeLabel="Закрыть форму заявки"
        onClose={() => setRequestOpen(false)}
        open={requestOpen}
        title="Обсудим ваш визит"
      >
        <p className="mb-6 leading-7 text-muted-ui-foreground">
          Оставьте контакты, и мы свяжемся с вами, чтобы обсудить количество
          гостей, формат программы и подобрать подходящее решение.
        </p>
        <div className="rounded-3xl bg-brand p-6 text-brand-foreground">
          <LeadRequestForm
            formCode="celebrations-request"
            formTitle="Заявка на корпоративный отдых"
            showDetails
            sourcePage="celebrations"
          />
        </div>
      </Modal>
    </main>
  );
};
