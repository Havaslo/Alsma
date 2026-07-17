import { ArrowRight } from "lucide-react";

import { AMAZI_ROUTES } from "@/AMAZI_ROUTES";
import corporateImage from "@/assets/alsma/corporate-checkins.webp";
import entertainmentKids from "@/assets/alsma/entertainment-kids.jpg";
import entertainmentMusic from "@/assets/alsma/entertainment-music.jpg";
import entertainmentRental from "@/assets/alsma/entertainment-rental.jpg";
import entertainmentThemed from "@/assets/alsma/entertainment-themed.jpg";
import animationImage from "@/assets/alsma/home-animation.jpg";
import ctaImage from "@/assets/alsma/home-cta.jpg";
import natureImage from "@/assets/alsma/home-nature.jpg";
import restaurantImage from "@/assets/alsma/home-restaurant.jpg";
import spaceImage from "@/assets/alsma/space-top-view.png";
import spaBath from "@/assets/alsma/spa-bath-v2.jpg";
import spaPrograms from "@/assets/alsma/spa-programs-v2.jpg";
import spaQuantum from "@/assets/alsma/spa-quantum-v2.jpg";

const spaCards = [
  ["Парение", "Мягкий банный ритуал для глубокого расслабления и восстановления.", spaBath],
  ["Аппаратные процедуры", "Современные методики для тонуса, восстановления и заботы о теле.", spaQuantum],
  ["SPA-программы", "Комплексные уходы для перезагрузки, красоты и внутреннего баланса.", spaPrograms],
] as const;

const features = [
  ["Величественная природа", ["Реликтовый лес", "Слияние двух рек", "Минеральная вода"], natureImage, AMAZI_ROUTES.about],
  ["Ресторан / кухня", ["Шведский стол", "Гастрономические истории"], restaurantImage, AMAZI_ROUTES.allInclusive],
  ["Анимация", ["Активная анимационная программа"], animationImage, AMAZI_ROUTES.entertainment],
] as const;

const entertainment = [
  ["Анимация для детей и взрослых", "Насыщенная программа активностей для всей семьи: игры, мастер-классы и вечерние события", entertainmentKids],
  ["Тематические заезды", "Особые программы выходных и праздников с уникальной атмосферой и сценариями отдыха", entertainmentThemed],
  ["Прокат", "Велосипеды, SUP-борды, лыжи, санки и всё для активного отдыха на природе", entertainmentRental],
  ["Живая музыка и шоу", "Вечерние концерты, музыкальные программы и яркие шоу для особого настроения", entertainmentMusic],
] as const;

export const HomeDiscoverySections = () => (
  <>
    <section className="bg-panel py-24" id="spa">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-heading text-4xl font-semibold sm:text-5xl">Технологии здоровья и ритуалы красоты</h2>
          <p className="mt-5 text-lg leading-8 text-muted-ui-foreground">Авторские программы восстановления объединяют чувственные ритуалы, аппаратные методики и атмосферу полной тишины.</p>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {spaCards.map(([title, description, image]) => (
            <article className="overflow-hidden rounded-3xl" key={title}>
              <div className="relative h-64 overflow-hidden rounded-3xl">
                <img alt={title} className="size-full object-cover" src={image} />
                <span className="absolute top-4 left-4 rounded-full bg-panel/95 px-4 py-2 text-xs font-semibold tracking-widest text-brand uppercase">дневное пребывание</span>
              </div>
              <h3 className="mt-5 font-heading text-2xl font-semibold">{title}</h3>
              <p className="mt-2 leading-7 text-muted-ui-foreground">{description}</p>
            </article>
          ))}
        </div>
        <div className="mt-12 text-center"><a className="inline-flex rounded-full bg-brand px-8 py-4 text-sm font-semibold text-brand-foreground" href={AMAZI_ROUTES.spa}>Посмотреть все процедуры</a></div>
      </div>
    </section>

    <section className="py-24" id="about">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <h2 className="text-center font-heading text-4xl font-semibold sm:text-5xl">Всё для вашего спокойного отдыха</h2>
        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map(([title, items, image, href]) => (
            <a className="group relative min-h-155 overflow-hidden rounded-4xl text-brand-foreground" href={href} key={title}>
              <img alt={title} className="absolute inset-0 size-full object-cover transition duration-500 group-hover:scale-105" src={image} />
              <div className="absolute inset-0 bg-gradient-to-t from-brand via-brand/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-8">
                <h3 className="font-heading text-3xl font-semibold">{title}</h3>
                <ul className="mt-4 space-y-2 font-medium">{items.map((item) => <li key={item}><span className="mr-2 text-accent-ui">•</span>{item}</li>)}</ul>
              </div>
            </a>
          ))}
        </div>
        <article className="mt-10 grid overflow-hidden rounded-4xl bg-panel lg:grid-cols-2">
          <img alt="Корпоративные заезды" className="min-h-80 size-full object-cover" src={corporateImage} />
          <div className="flex flex-col justify-center p-10 lg:p-14">
            <p className="text-xs font-semibold tracking-widest text-muted-ui-foreground uppercase">Индивидуальный подход</p>
            <h3 className="mt-4 font-heading text-4xl font-semibold">Корпоративные заезды</h3>
            <p className="mt-5 leading-8 text-muted-ui-foreground">Подстроимся под любой повод, праздник, корпоратив. Индивидуальный подход к каждому отдыху.</p>
            <a className="mt-8 inline-flex w-fit rounded-full bg-brand px-7 py-4 text-sm font-semibold text-brand-foreground" href={AMAZI_ROUTES.celebrations}>Подробнее</a>
          </div>
        </article>
      </div>
    </section>

    <section className="hidden bg-brand py-24 text-brand-foreground md:block">
      <div className="mx-auto max-w-7xl px-6">
        <h2 className="mb-10 text-center font-heading text-4xl font-semibold sm:text-5xl">Пространство тишины с видом сверху</h2>
        <div className="rounded-4xl border border-supporting p-5"><img alt="Пространство тишины с видом сверху" className="w-full rounded-3xl" src={spaceImage} /></div>
      </div>
    </section>

    <section className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-center"><h2 className="font-heading text-4xl font-semibold sm:text-5xl">Развлечения и анимация</h2><p className="mt-4 text-muted-ui-foreground">Насыщенная программа активностей для гостей всех возрастов</p></div>
        <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {entertainment.map(([title, description, image]) => (
            <article className="flex overflow-hidden rounded-3xl bg-panel xl:flex-col" key={title}>
              <img alt={title} className="w-2/5 object-cover xl:h-48 xl:w-full" src={image} />
              <div className="flex flex-1 flex-col p-6"><h3 className="font-heading text-2xl font-semibold">{title}</h3><p className="mt-3 leading-7 text-muted-ui-foreground">{description}</p><a className="mt-6 inline-flex w-fit items-center gap-2 font-semibold text-brand" href={AMAZI_ROUTES.entertainment}>Подробнее <ArrowRight className="size-4" /></a></div>
            </article>
          ))}
        </div>
      </div>
    </section>

    <section className="py-24" id="contacts">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="rounded-4xl bg-muted-ui/65 p-8 sm:p-10">
          <h2 className="font-heading text-4xl font-semibold sm:text-5xl">Ждем вас в гости</h2>
          <div className="mt-8 space-y-6 leading-7"><div><p className="text-xs text-muted-ui-foreground">Адрес</p><p className="mt-2">Нижегородская область, 35 км от Н. Новгорода</p></div><div><p className="text-xs text-muted-ui-foreground">Телефон</p><a className="mt-2 block font-medium text-brand" href="tel:+79302838828">+7 930 283-88-28</a></div><div className="grid grid-cols-2 gap-4"><div><p className="text-xs text-muted-ui-foreground">Заезд</p><p className="mt-2">с 14:00</p></div><div><p className="text-xs text-muted-ui-foreground">Выезд</p><p className="mt-2">до 12:00</p></div></div></div>
          <div className="mt-10 rounded-3xl bg-page p-7"><p className="text-xs font-semibold text-brand">Фирменный трансфер</p><p className="mt-4 leading-7 text-muted-ui-foreground">Комфорт-класс с персональной встречей, водой в салоне и маршрутом через самые живописные лесные дороги.</p></div>
        </div>
        <iframe allowFullScreen className="min-h-130 w-full rounded-4xl border-0" src="https://yandex.ru/map-widget/v1/?ll=44.113128%2C56.537617&z=16" title="Яндекс Карта с отметкой отеля АЛСМА" />
      </div>
    </section>

    <section className="px-4 pb-24 sm:px-6">
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-4xl px-6 py-14 text-center text-brand-foreground">
        <img alt="" className="absolute inset-0 size-full object-cover" src={ctaImage} />
        <div className="absolute inset-0 bg-brand/80" />
        <div className="relative"><p className="text-xs font-semibold tracking-widest uppercase opacity-75">Поможем выбрать формат отдыха</p><h2 className="mt-4 font-heading text-4xl font-semibold sm:text-5xl">Планируете отдых в АЛСМЕ?</h2><p className="mx-auto mt-6 max-w-4xl text-lg leading-8 opacity-85">Оставьте заявку, если хотите забронировать номер или узнать подробнее об услугах, SPA, проживании и сценариях отдыха.</p><a className="mt-8 inline-flex rounded-full bg-brand px-8 py-4 text-sm font-semibold" href="#booking">Подробнее</a></div>
      </div>
    </section>
  </>
);
