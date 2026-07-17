import { Clock, Mail, MapPin, Phone, RussianRuble } from "lucide-react";

import heroImage from "@/assets/alsma/spa-programs.jpg";
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
import { PUBLIC_PAGES } from "@/lib/site/public-pages";
import { usePublishedSiteContent } from "@/lib/site/useSiteContent";

export const AboutPage = () => {
  const page = PUBLIC_PAGES.about;
  const content = usePublishedSiteContent("about");
  const hero = content.data?.items.find(
    (item) => item.itemKey === "hero",
  )?.content;
  const title = typeof hero?.title === "string" ? hero.title : "О нас";
  const description =
    typeof hero?.description === "string" ? hero.description : page.description;

  return (
    <main className="min-h-screen bg-page text-page-foreground">
      <SiteHeader />
      <PublicHero
        description={description}
        eyebrow="Об АЛСМА"
        image={typeof hero?.image === "string" ? hero.image : heroImage}
        title={title}
      />
      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8" id="details">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="font-heading text-4xl font-semibold sm:text-5xl">
            Загородный SPA-отель для всей семьи
          </h2>
          <p className="mt-6 text-lg leading-8 text-muted-ui-foreground">
            Мы находимся в сосновом лесу у слияния рек Линда и Алсма — всего в
            35 км от Нижнего Новгорода. Сюда приезжают на день, выходные,
            отпуск, праздник или корпоратив.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {HOTEL_ADVANTAGES.map((item) => (
            <article className="rounded-3xl bg-panel p-7" key={item.title}>
              <span className="grid size-12 place-items-center rounded-2xl bg-brand/10 text-brand">
                ✦
              </span>
              <h3 className="mt-6 font-heading text-2xl font-semibold">
                {item.title}
              </h3>
              <p className="mt-4 leading-7 text-muted-ui-foreground">
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </section>
      <section className="bg-panel py-24">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 sm:px-8 lg:grid-cols-2">
          <div className="rounded-4xl bg-page p-8 sm:p-10">
            <h2 className="font-heading text-4xl font-semibold">
              Контакты и расположение
            </h2>
            <p className="mt-6 flex gap-3 leading-7">
              <MapPin className="mt-1 size-5 shrink-0 text-brand" />{" "}
              Нижегородская область, г. Бор, д. Васильково, ул. Лесная, д. 7
            </p>
            <div className="mt-8 space-y-5">
              {HOTEL_CONTACTS.map(([label, value, href]) => (
                <div key={label}>
                  <p className="text-sm text-muted-ui-foreground">{label}</p>
                  <a
                    className="mt-1 flex items-center gap-2 font-semibold text-brand"
                    href={href}
                  >
                    <Phone className="size-4" /> {value}
                  </a>
                </div>
              ))}
              <a
                className="flex items-center gap-2 font-semibold text-brand"
                href="mailto:info@alsma-baza.ru"
              >
                <Mail className="size-4" /> info@alsma-baza.ru
              </a>
            </div>
          </div>
          <iframe
            className="size-full min-h-[32rem] rounded-4xl border-0"
            src="https://yandex.ru/map-widget/v1/?ll=44.114214%2C56.535555&z=10"
            title="Отель АЛСМА на карте"
          />
        </div>
      </section>
      <SocialLinksSection
        description="Публикуем специальные предложения, новости отеля, анонсы заездов и атмосферные кадры из лесного SPA-отдыха."
        title="Узнавайте первыми о новых акциях, событиях и красивых моментах отдыха в АЛСМА"
      />
      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
        <h2 className="text-center font-heading text-4xl font-semibold sm:text-5xl">
          Трансфер до отеля
        </h2>
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {TRANSFER_OPTIONS.map((option) => (
            <article
              className="rounded-3xl border border-line p-7"
              key={option.title}
            >
              <h3 className="font-heading text-3xl font-semibold text-brand">
                {option.title}
              </h3>
              <p className="mt-4 leading-7 text-muted-ui-foreground">
                {option.description}
              </p>
              <div className="mt-7 flex flex-wrap gap-4 text-sm font-semibold">
                <span className="flex items-center gap-2">
                  <MapPin className="size-4 text-brand" /> {option.distance}
                </span>
                <span className="flex items-center gap-2">
                  <Clock className="size-4 text-brand" /> {option.time}
                </span>
                <span className="flex items-center gap-2">
                  <RussianRuble className="size-4 text-brand" /> {option.price}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="bg-brand py-20 text-brand-foreground">
        <div className="mx-auto max-w-4xl px-5 sm:px-8">
          <h2 className="font-heading text-4xl font-semibold sm:text-5xl">
            Заказать трансфер
          </h2>
          <p className="mt-4 mb-8 text-brand-foreground/75">
            Согласуем поездку и удобное время встречи заранее.
          </p>
          <TransferRequestForm />
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
        <div className="text-center">
          <p className="text-sm font-semibold tracking-widest text-brand uppercase">
            Для вашего удобства
          </p>
          <h2 className="mt-4 font-heading text-4xl font-semibold sm:text-5xl">
            График работы служб
          </h2>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {HOTEL_SERVICE_HOURS.map((service) => (
            <article
              className="rounded-3xl border border-line p-7"
              key={service.title}
            >
              <h3 className="font-heading text-3xl font-semibold">
                {service.title}
              </h3>
              <p className="mt-4 text-xl font-semibold text-brand">
                {service.hours}
              </p>
              <p className="mt-3 text-muted-ui-foreground">{service.note}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
};
