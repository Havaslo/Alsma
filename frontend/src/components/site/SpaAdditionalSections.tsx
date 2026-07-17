import { Check } from "lucide-react";

import cafeImage from "@/assets/alsma/spa-cafe-mineral-new.jpg";
import {
  SPA_COMPANY_FORMATS,
  SPA_CONTRAINDICATIONS,
  SPA_PROMOTIONS,
} from "@/lib/site/spa";

const ceremonyGroups = [
  {
    items: [
      "Коллективное парение — 15 минут, 500 ₽ с человека",
      "Индивидуальное парение — 15 минут, 2 500 ₽",
      "Берёзовый, дубовый или пихтовый веник — 450 ₽",
    ],
    title: "Парение на травах",
  },
  {
    items: [
      "Берберский ритуал — 40 минут, 3 700 ₽",
      "Марокканский ритуал — 60 минут, 4 500 ₽",
      "Пенный массаж с рукавичкой Кесе — 30 минут, 2 700 ₽",
    ],
    title: "SPA-церемонии",
  },
] as const;

const additionalServices = [
  ["Минерально-молочная ванна «Клеопатра» — 20 мин", "1 300 ₽"],
  ["Жемчужная ванна — 20 мин", "1 000 ₽"],
  ["Минеральная ванна с морской солью — 20 мин", "1 000 ₽"],
  ["Йодобромная минеральная ванна — 20 мин", "1 200 ₽"],
  ["Хлорофиловая ванна — 20 мин", "1 200 ₽"],
  ["Салициловая ванна — 20 мин", "1 200 ₽"],
  ["Душ Шарко — 20 мин", "800 ₽"],
  ["Гидромассажная ванна с подводным душем — 20 мин", "1 200 ₽"],
  ["Циркулярный душ — 10 мин", "600 ₽"],
  ["SPA-капсула водная — 30 мин", "1 500 ₽"],
  ["SPA-капсула сухая — 30 мин", "1 300 ₽"],
  ["SPA-капсула с углекислым газом и кислородом — 30 мин", "1 700 ₽"],
  ["Аренда халата", "150 ₽"],
  ["Одноразовые тапочки", "100 ₽"],
  ["Чайная церемония", "350 ₽"],
  ["Дневное посещение — взрослые", "1 000 ₽"],
  ["Дневное посещение — дети", "500 ₽"],
  ["Абонемент на 8 посещений — взрослые", "3 500 ₽"],
  ["Абонемент на 8 посещений — дети", "2 500 ₽"],
  ["Групповой сеанс с 21:00 до 23:00", "5 000 ₽"],
  ["Аренда SPA-комплекса — 1,5 часа", "15 000 ₽"],
  ["Баня-бочка — 1 час", "1 200 ₽"],
  ["Парафинотерапия рук или ног — 20 мин", "800 ₽"],
] as const;

export const SpaMembershipSection = () => (
  <section className="px-5 pb-10 sm:px-8">
    <div className="mx-auto grid max-w-7xl gap-8 rounded-4xl bg-brand px-7 py-10 text-brand-foreground sm:px-10 lg:grid-cols-[1fr_auto] lg:items-center lg:px-14">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold tracking-widest uppercase opacity-65">Абонемент на SPA</p>
        <h2 className="mt-4 font-heading text-4xl font-semibold sm:text-5xl">Абонемент на SPA</h2>
        <p className="mt-5 text-lg leading-8 opacity-80">8 посещений SPA-комплекса в месяц: уличные и внутренний бассейны, джакузи, соляная, финская, паровая и травяная сауны, душ впечатлений. Взрослые — 3 500 ₽, дети — 2 500 ₽.</p>
      </div>
      <a className="inline-flex justify-center rounded-full bg-accent-ui px-8 py-4 font-semibold text-accent-ui-foreground" href="#spa-cta">Купить абонемент</a>
    </div>
  </section>
);

export const SpaAdditionalServicesSection = () => (
  <section className="px-5 py-24 sm:px-8">
    <div className="mx-auto max-w-7xl">
      <div className="text-center">
        <p className="text-sm font-semibold tracking-widest text-brand uppercase">Посещение и сервис</p>
        <h2 className="mx-auto mt-4 max-w-4xl font-heading text-4xl font-semibold sm:text-5xl">Дополнительные услуги и посещение SPA</h2>
      </div>
      <div className="mt-12 overflow-hidden rounded-4xl bg-panel">
        <table className="w-full border-collapse text-left">
          <thead><tr className="bg-muted-ui/50 text-sm uppercase text-muted-ui-foreground"><th className="px-5 py-4 sm:px-7">Услуга</th><th className="px-5 py-4 sm:px-7">Стоимость</th></tr></thead>
          <tbody>{additionalServices.map(([service, price]) => <tr className="border-t border-line" key={service}><td className="px-5 py-4 sm:px-7">{service}</td><td className="whitespace-nowrap px-5 py-4 font-semibold sm:px-7">{price}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  </section>
);

export const SpaCeremoniesSection = () => (
  <section className="bg-panel py-24">
    <div className="mx-auto max-w-7xl px-5 sm:px-8">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-semibold tracking-widest text-brand uppercase">
          Ритуалы и церемонии
        </p>
        <h2 className="mt-4 font-heading text-4xl font-semibold sm:text-5xl">
          SPA-церемонии и парения
        </h2>
        <p className="mt-5 text-lg text-muted-ui-foreground">
          Парения на травах, хаммам-ритуалы и программы полного погружения.
        </p>
      </div>
      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        {ceremonyGroups.map((group) => (
          <article className="rounded-3xl bg-page p-7" key={group.title}>
            <h3 className="font-heading text-3xl font-semibold">
              {group.title}
            </h3>
            <ul className="mt-6 space-y-3">
              {group.items.map((item) => (
                <li className="rounded-2xl bg-panel px-5 py-4" key={item}>
                  {item}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
      <article className="mt-6 rounded-3xl bg-page p-7">
        <h3 className="font-heading text-3xl font-semibold">SPA-программы</h3>
        <p className="mt-3 text-muted-ui-foreground">
          Программы «Манго», «Шоколад», «Водоросли» и «Франжипани» включают
          скраб, обёртывание, массаж и уход. 90 минут — 6 000 ₽.
        </p>
      </article>
    </div>
  </section>
);

export const SpaCompanySection = () => (
  <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
    <div className="mx-auto max-w-3xl text-center">
      <h2 className="font-heading text-4xl font-semibold sm:text-5xl">
        SPA для компаний
      </h2>
      <p className="mt-5 text-lg text-muted-ui-foreground">
        Организуем праздник без хлопот для компании от 2 до 15 человек.
      </p>
    </div>
    <div className="mt-12 grid gap-6 lg:grid-cols-3">
      {SPA_COMPANY_FORMATS.map((format) => (
        <article
          className="rounded-3xl border border-line p-7"
          key={format.title}
        >
          <h3 className="font-heading text-3xl font-semibold">
            {format.title}
          </h3>
          <ul className="mt-6 space-y-3">
            {format.items.map((item) => (
              <li className="flex gap-3" key={item}>
                <Check className="mt-1 size-4 shrink-0 text-brand" /> {item}
              </li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  </section>
);

export const SpaPromotionsSection = () => (
  <section className="bg-panel py-24">
    <div className="mx-auto max-w-7xl px-5 sm:px-8">
      <h2 className="text-center font-heading text-4xl font-semibold sm:text-5xl">
        Актуальные акции
      </h2>
      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {SPA_PROMOTIONS.map((promotion) => (
          <article
            className="overflow-hidden rounded-3xl bg-page"
            key={promotion.title}
          >
            <img
              alt={promotion.title}
              className="h-60 w-full object-cover"
              src={promotion.image}
            />
            <div className="p-7">
              <h3 className="font-heading text-3xl font-semibold">
                {promotion.title}
              </h3>
              <p className="mt-4 text-muted-ui-foreground">
                {promotion.description}
              </p>
              <p className="mt-5 text-sm text-brand">{promotion.deadline}</p>
              <p className="mt-2 text-2xl font-semibold">{promotion.price}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  </section>
);

export const SpaInformationSections = () => (
  <>
    <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
      <article className="overflow-hidden rounded-4xl bg-panel lg:grid lg:grid-cols-2">
        <img
          alt="Кафе Минерал"
          className="size-full min-h-80 object-cover"
          src={cafeImage}
        />
        <div className="p-8 sm:p-12">
          <p className="text-sm font-semibold tracking-widest text-brand uppercase">
            Кафе при SPA-комплексе
          </p>
          <h2 className="mt-4 font-heading text-4xl font-semibold sm:text-5xl">
            Кафе «Минерал»
          </h2>
          <p className="mt-5 leading-7 text-muted-ui-foreground">
            Полезное меню, свежевыжатые соки, детокс-напитки и лёгкие закуски
            для завершения SPA-программы.
          </p>
          <p className="mt-6 rounded-2xl bg-page px-5 py-4 font-medium">
            Ежедневно с 10:00 до 22:00
          </p>
        </div>
      </article>
    </section>
    <SpaAdditionalServicesSection />
    <section className="bg-panel py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <p className="text-sm font-semibold tracking-widest text-brand uppercase">
          Важно знать
        </p>
        <h2 className="mt-4 font-heading text-4xl font-semibold sm:text-5xl">
          Общие противопоказания
        </h2>
        <ul className="mt-8 grid gap-3 md:grid-cols-2">
          {SPA_CONTRAINDICATIONS.map((item) => (
            <li className="flex gap-3 rounded-2xl bg-page p-5" key={item}>
              <Check className="mt-1 size-4 shrink-0 text-brand" /> {item}
            </li>
          ))}
        </ul>
        <p className="mt-6 text-muted-ui-foreground">
          При беременности процедуры возможны после 12-й недели по согласованию
          со специалистом.
        </p>
      </div>
    </section>
  </>
);
