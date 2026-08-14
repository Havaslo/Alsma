import {
  BedDouble,
  CalendarDays,
  Clock,
  Droplets,
  House,
  MapPin,
  Phone,
  RussianRuble,
  Trees,
  Utensils,
  Waves,
} from "lucide-react";

import heroImage from "@/assets/alsma/about-hero-forest.webp";
import { PublicHero } from "@/components/site/PublicHero";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SocialLinksSection } from "@/components/site/SocialLinksSection";
import { TransferRequestForm } from "@/components/site/TransferRequestForm";
import {
  HOTEL_ADVANTAGES,
  HOTEL_CONTACTS,
  HOTEL_SERVICE_HOURS,
  TRANSFER_OPTIONS,
} from "@/lib/site/about";
import {
  ABOUT_DOCUMENTS,
  type AboutDocument,
} from "@/lib/site/about-documents";
import { getSiteCollection } from "@/lib/site/content-collections";
import { PUBLIC_PAGES } from "@/lib/site/public-pages";
import { usePublishedSiteContent } from "@/lib/site/useSiteContent";

const advantageIcons = [Waves, Utensils, Droplets, House, Trees, CalendarDays];
const advantageIconTones = [
  "bg-brand/10 text-brand",
  "bg-accent-ui/20 text-accent-ui-foreground",
  "bg-supporting/30 text-brand",
  "bg-muted-ui text-brand",
  "bg-brand/10 text-brand",
  "bg-destructive/10 text-destructive",
];

export const AboutPage = () => {
  const page = PUBLIC_PAGES.about;
  const content = usePublishedSiteContent("about");
  const hero = content.data?.items?.find(
    (item) => item.itemKey === "hero",
  )?.content;
  const title = typeof hero?.title === "string" ? hero.title : "О нас";
  const description =
    typeof hero?.description === "string" ? hero.description : page.description;
  const documents = getSiteCollection<AboutDocument>(
    content.data?.items,
    "documents",
    ABOUT_DOCUMENTS,
  );

  return (
    <main className="min-h-screen bg-page text-page-foreground">
      <SiteHeader />
      <PublicHero
        description={description}
        eyebrow="Об АЛСМА"
        image={typeof hero?.image === "string" ? hero.image : heroImage}
        title={title}
      />

      <section
        className="mx-auto max-w-[100rem] px-5 py-24 sm:px-8"
        id="details"
      >
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="font-heading text-4xl font-semibold sm:text-5xl">
            «АЛСМА» — загородный отдых среди природы
          </h2>
          <p className="mt-6 text-lg leading-8 text-muted-ui-foreground">
            Мы находимся в сосновом лесу у слияния рек Линда и АЛСМА — всего в
            35 км от Нижнего Новгорода. Здесь можно приехать на день, выходные,
            отпуск, праздник или корпоратив.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {HOTEL_ADVANTAGES.map((item, index) => {
            const Icon = advantageIcons[index] ?? BedDouble;
            const iconTone =
              advantageIconTones[index] ?? "bg-brand/10 text-brand";
            return (
              <article
                className="rounded-3xl bg-brand-foreground p-7"
                key={item.title}
              >
                <span
                  className={`grid size-16 place-items-center rounded-3xl ${iconTone}`}
                >
                  <Icon className="size-8" />
                </span>
                <h3 className="mt-6 font-heading text-2xl font-semibold">
                  {item.title}
                </h3>
                <p className="mt-4 leading-7 text-muted-ui-foreground">
                  {item.description}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-[100rem] rounded-4xl bg-panel px-6 py-12 sm:px-10 lg:px-12">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-heading text-4xl font-semibold sm:text-5xl">
              Контакты и расположение
            </h2>
            <p className="mt-4 text-muted-ui-foreground">
              Актуальные контакты отеля, адрес и основная информация для связи
              перед поездкой.
            </p>
          </div>
          <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_1.35fr]">
            <div className="rounded-4xl bg-brand-foreground p-8 sm:p-10">
              <h3 className="font-heading text-3xl font-semibold">Контакты</h3>
              <p className="mt-3 text-muted-ui-foreground">
                Свяжитесь с нами по вопросам бронирования, заездов, размещения и
                организационных деталей.
              </p>
              <div className="mt-8 space-y-6">
                <div>
                  <p className="text-sm text-muted-ui-foreground">Адрес</p>
                  <p className="mt-2 leading-7">
                    Нижегородская обл., г. Бор, д. Васильково, ул. Лесная, д. 7
                  </p>
                </div>
                {HOTEL_CONTACTS.map(([label, value, href]) => (
                  <div key={label}>
                    <p className="text-sm text-muted-ui-foreground">{label}</p>
                    <a
                      className="mt-2 flex items-center gap-2 font-semibold text-brand"
                      href={href}
                    >
                      <Phone className="size-4" /> {value}
                    </a>
                  </div>
                ))}
                <div>
                  <p className="text-sm text-muted-ui-foreground">
                    Электронная почта
                  </p>
                  <a
                    className="mt-2 block font-semibold text-brand"
                    href="mailto:info@alsma-baza.ru"
                  >
                    info@alsma-baza.ru
                  </a>
                </div>
              </div>
            </div>
            <iframe
              className="size-full min-h-[32rem] rounded-4xl border-0"
              src="https://yandex.ru/map-widget/v1/?rtext=56.535555%2C44.114214~56.355104%2C43.924790&rtt=auto"
              title="Отель АЛСМА на карте"
            />
          </div>
        </div>
      </section>

      <section className="px-5 pb-24 sm:px-8">
        <div className="mx-auto max-w-[100rem]">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-heading text-4xl font-semibold sm:text-5xl">
              Документы
            </h2>
            <p className="mt-4 text-muted-ui-foreground">
              Официальные документы и лицензии отеля. Нажмите на превью, чтобы
              открыть файл.
            </p>
          </div>
          <div className="mx-auto mt-10 grid max-w-6xl justify-items-center gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {documents.map((document) => (
              <a
                className="group w-full max-w-sm text-center"
                href={document.href}
                key={document.href}
                rel="noreferrer"
                target="_blank"
              >
                <span className="block h-[32rem] overflow-hidden rounded-2xl border border-line bg-white shadow-sm transition group-hover:-translate-y-1 group-hover:border-brand group-hover:shadow-lg">
                  <iframe
                    className="pointer-events-none h-[calc(32rem+56px)] w-full -translate-y-14"
                    src={`${document.href}#page=1&view=FitH&toolbar=0&navpanes=0&scrollbar=0`}
                    title={`Первая страница документа «${document.title}»`}
                  />
                </span>
                <span className="mt-4 block font-semibold transition group-hover:text-brand">
                  {document.title}
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <SocialLinksSection
        description="Публикуем специальные предложения, новости отеля, анонсы заездов и атмосферные кадры из лесного SPA-отдыха."
        title="Узнавайте первыми о новых акциях, событиях и красивых моментах отдыха в АЛСМА"
      />

      <section className="px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-[100rem] rounded-4xl bg-panel px-6 py-12 sm:px-10 lg:px-12">
          <h2 className="text-center font-heading text-4xl font-semibold sm:text-5xl">
            Трансфер до отеля
          </h2>
          <p className="mt-4 text-center text-muted-ui-foreground">
            Актуальная информация по трансферу до спа-отеля «АЛСМА».
          </p>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {TRANSFER_OPTIONS.map((option) => (
              <article
                className="flex min-h-64 flex-col rounded-3xl bg-brand-foreground p-7"
                key={option.title}
              >
                <h3 className="font-heading text-3xl font-semibold text-brand">
                  {option.title}
                </h3>
                <p className="mt-4 leading-7 text-muted-ui-foreground">
                  {option.description}
                </p>
                <div className="mt-auto flex flex-wrap gap-4 pt-8 text-sm font-semibold">
                  <span className="flex items-center gap-2">
                    <MapPin className="size-4 text-brand" /> {option.distance}
                  </span>
                  <span className="flex items-center gap-2">
                    <Clock className="size-4 text-brand" /> {option.time}
                  </span>
                  <span className="flex items-center gap-2">
                    <RussianRuble className="size-4 text-brand" />{" "}
                    {option.price}
                  </span>
                </div>
              </article>
            ))}
          </div>
          <div className="mx-auto mt-12 max-w-6xl rounded-4xl bg-brand-foreground p-7 sm:p-10">
            <div className="text-center">
              <h2 className="font-heading text-3xl font-semibold">
                Заказать трансфер
              </h2>
              <p className="mt-3 text-muted-ui-foreground">
                Оставьте заявку, если хотите заранее согласовать поездку и
                удобное время встречи.
              </p>
            </div>
            <TransferRequestForm />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[100rem] px-5 py-24 sm:px-8">
        <div className="text-center">
          <p className="text-sm font-semibold tracking-widest text-brand uppercase">
            Для вашего удобства
          </p>
          <h2 className="mt-4 font-heading text-4xl font-semibold sm:text-5xl">
            График работы служб
          </h2>
          <p className="mt-4 text-muted-ui-foreground">
            Актуальный режим работы ресторанной зоны, SPA и основных служб
            отеля.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3 lg:grid-cols-4">
          {HOTEL_SERVICE_HOURS.map((service) => (
            <article
              className="rounded-3xl bg-brand-foreground p-8"
              key={service.title}
            >
              <h3 className="text-xl font-semibold">{service.title}</h3>
              <p className="mt-5 leading-7 font-semibold text-brand">
                {service.hours}
              </p>
              <p className="mt-3 leading-7 text-muted-ui-foreground">
                {service.note}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
};
