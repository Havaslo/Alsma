import { useState } from "react";
import { useForm } from "react-hook-form";

import corporateImage from "@/assets/alsma/corporate-checkins.webp";
import entertainmentKids from "@/assets/alsma/entertainment-kids.jpg";
import entertainmentMusic from "@/assets/alsma/entertainment-music.jpg";
import entertainmentRental from "@/assets/alsma/entertainment-rental.jpg";
import entertainmentThemed from "@/assets/alsma/entertainment-themed.jpg";
import animationImage from "@/assets/alsma/feature-animation.png";
import natureImage from "@/assets/alsma/feature-nature.png";
import restaurantImage from "@/assets/alsma/feature-restaurant.png";
import ctaImage from "@/assets/alsma/home-cta.jpg";
import spaProcedures from "@/assets/alsma/spa-procedures.png";
import spaPrograms from "@/assets/alsma/spa-programs-v2.jpg";
import spaSteam from "@/assets/alsma/spa-steam.png";
import spaceImage from "@/assets/alsma/space-top-view.png";
import { Form } from "@/components/Form";
import { Loader } from "@/components/ui/Loader";
import { Modal } from "@/components/ui/Modal";
import { useCreateLead } from "@/lib/leads/useCreateLead";
import { ROUTES } from "@/route-constants";

const spaCards = [
  [
    "Парение",
    "Мягкий банный ритуал для глубокого расслабления и восстановления.",
    spaSteam,
  ],
  [
    "Аппаратные процедуры",
    "Современные методики для тонуса, восстановления и заботы о теле.",
    spaProcedures,
  ],
  [
    "Массаж и SPA-процедуры",
    "Комплексные уходы для перезагрузки, красоты и внутреннего баланса.",
    spaPrograms,
  ],
] as const;

const features = [
  [
    "Величественная природа",
    ["Реликтовый лес", "Слияние двух рек", "Минеральная вода"],
    natureImage,
    ROUTES.about,
  ],
  [
    "Ресторан / кухня",
    ["Шведский стол", "Гастрономические истории"],
    animationImage,
    ROUTES.allInclusive,
  ],
  [
    "Анимация",
    ["Активная анимационная программа"],
    restaurantImage,
    ROUTES.entertainment,
  ],
] as const;

const entertainment = [
  [
    "Анимация для детей и взрослых",
    "Насыщенная программа активностей для всей семьи: игры, мастер-классы и вечерние события",
    entertainmentKids,
  ],
  [
    "Тематические заезды",
    "Особые программы выходных и праздников с уникальной атмосферой и сценариями отдыха",
    entertainmentThemed,
  ],
  [
    "Прокат",
    "Велосипеды, SUP-борды, лыжи, санки и всё для активного отдыха на природе",
    entertainmentRental,
  ],
  [
    "Живая музыка и шоу",
    "Вечерние концерты, музыкальные программы и яркие шоу для особого настроения",
    entertainmentMusic,
  ],
] as const;

const mapMarkers = [
  { label: "Спортивная площадка", position: "top-[26%] left-[38%]" },
  { label: "SPA-комплекс", position: "top-[51%] left-[60%]" },
  { label: "Ресторан", position: "top-[45%] left-[71%]" },
  { label: "Главный корпус", position: "top-[42%] left-[80%]" },
  { label: "Парковка", position: "top-[42%] left-[90%]" },
  { label: "Коттедж у реки", position: "top-[62%] left-[9%]" },
  { label: "Лесной коттедж", position: "top-[64%] left-[18%]" },
  { label: "Семейный коттедж", position: "top-[61%] left-[29%]" },
  { label: "Банный дом", position: "top-[75%] left-[56%]" },
  { label: "Летний павильон", position: "top-[73%] left-[66%]" },
  { label: "Пляж", position: "top-[71%] left-[80%]" },
] as const;

const HomeMapSection = () => {
  const [selectedMarker, setSelectedMarker] = useState<number | null>(null);

  return (
    <section className="hidden bg-brand py-24 text-brand-foreground md:block">
      <div className="mx-auto max-w-[100rem] px-6">
        <h2 className="mb-10 text-center font-heading text-4xl font-semibold sm:text-5xl">
          Пространство тишины с видом сверху
        </h2>
        <div className="rounded-4xl border border-supporting p-5">
          <div className="relative overflow-hidden rounded-3xl">
            <img
              alt="Пространство тишины с видом сверху"
              className="w-full"
              src={spaceImage}
            />
            {mapMarkers.map((marker, index) => (
              <button
                aria-label={marker.label}
                className={`absolute grid size-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-4 border-page bg-supporting shadow-lg transition hover:scale-110 ${marker.position}`}
                key={marker.label}
                onClick={() =>
                  setSelectedMarker(selectedMarker === index ? null : index)
                }
                type="button"
              />
            ))}
            {selectedMarker !== null && (
              <div
                className={`absolute -translate-x-1/2 -translate-y-full pb-5 ${mapMarkers[selectedMarker].position}`}
              >
                <div className="w-52 rounded-3xl border-8 border-page bg-page p-2 text-center text-page-foreground shadow-xl">
                  <img
                    alt=""
                    className="h-36 w-full rounded-2xl object-cover"
                    src={spaceImage}
                  />
                  <p className="px-2 pt-3 pb-1 font-semibold">
                    {mapMarkers[selectedMarker].label}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export const HomeExperienceSections = () => (
  <>
    <section className="bg-panel py-24" id="spa">
      <div className="mx-auto max-w-[100rem] px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-heading text-4xl font-semibold sm:text-5xl">
            Технологии здоровья и ритуалы красоты
          </h2>
          <p className="mt-5 text-lg leading-8 text-muted-ui-foreground">
            Авторские программы восстановления объединяют чувственные ритуалы,
            аппаратные методики и атмосферу полной тишины.
          </p>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {spaCards.map(([title, description, image]) => (
            <article className="rounded-3xl" key={title}>
              <div className="relative h-64 overflow-hidden rounded-3xl">
                <img
                  alt={title}
                  className="size-full object-cover"
                  src={image}
                />
              </div>
              <h3 className="mt-5 font-heading text-2xl font-semibold">
                {title}
              </h3>
              <p className="mt-2 leading-7 text-muted-ui-foreground">
                {description}
              </p>
            </article>
          ))}
        </div>
        <div className="mt-12 text-center">
          <a
            className="inline-flex rounded-full bg-brand px-8 py-4 text-sm font-semibold text-brand-foreground"
            href={ROUTES.spa}
          >
            Посмотреть все процедуры
          </a>
        </div>
      </div>
    </section>

    <section className="py-24" id="about">
      <div className="mx-auto max-w-[100rem] px-4 sm:px-6">
        <h2 className="text-center font-heading text-4xl font-semibold sm:text-5xl">
          Всё для вашего спокойного отдыха
        </h2>
        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map(([title, items, image, href]) => (
            <a
              className="group relative min-h-155 overflow-hidden rounded-4xl text-brand-foreground"
              href={href}
              key={title}
            >
              <img
                alt={title}
                className="absolute inset-0 size-full object-cover transition duration-500 group-hover:scale-105"
                src={image}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-booking-line/95 via-booking-line/35 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-8">
                <h3 className="font-heading text-3xl font-semibold">{title}</h3>
                <ul className="mt-4 space-y-2 font-medium">
                  {items.map((item) => (
                    <li key={item}>
                      <span className="mr-2 text-accent-ui">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </a>
          ))}
        </div>
        <article className="mt-10 grid overflow-hidden rounded-4xl bg-panel lg:grid-cols-2">
          <img
            alt="Корпоративные заезды"
            className="size-full min-h-80 object-cover"
            src={corporateImage}
          />
          <div className="flex flex-col justify-center p-10 lg:p-14">
            <p className="text-xs font-semibold tracking-widest text-muted-ui-foreground uppercase">
              Индивидуальный подход
            </p>
            <h3 className="mt-4 font-heading text-4xl font-semibold">
              Корпоративные заезды
            </h3>
            <p className="mt-5 leading-8 text-muted-ui-foreground">
              Подстроимся под любой повод, праздник, корпоратив. Индивидуальный
              подход к каждому отдыху.
            </p>
            <a
              className="mt-8 inline-flex w-fit rounded-full bg-brand px-7 py-4 text-sm font-semibold text-brand-foreground"
              href={ROUTES.celebrations}
            >
              Подробнее
            </a>
          </div>
        </article>
      </div>
    </section>

    <HomeMapSection />

    <section className="py-24">
      <div className="mx-auto max-w-[100rem] px-4 sm:px-6">
        <div className="text-center">
          <h2 className="font-heading text-4xl font-semibold sm:text-5xl">
            Развлечения и анимация
          </h2>
          <p className="mt-4 text-muted-ui-foreground">
            Насыщенная программа активностей для гостей всех возрастов
          </p>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {entertainment.map(([title, description, image]) => (
            <article
              className="flex flex-col overflow-hidden rounded-3xl bg-panel md:flex-row xl:flex-col"
              key={title}
            >
              <img
                alt={title}
                className="h-48 w-full object-cover md:h-auto md:w-2/5 xl:h-48 xl:w-full"
                src={image}
              />
              <div className="flex flex-1 flex-col p-6">
                <h3 className="font-heading text-2xl font-semibold">{title}</h3>
                <p className="mt-3 leading-7 text-muted-ui-foreground">
                  {description}
                </p>
                <a
                  className="mt-6 inline-flex w-fit rounded-full bg-brand px-6 py-3 text-sm font-semibold text-brand-foreground md:mt-auto xl:mt-6"
                  href={ROUTES.entertainment}
                >
                  Подробнее
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  </>
);

export const HomeContactSections = () => {
  const [inquiryOpen, setInquiryOpen] = useState(false);

  return (
    <>
      <section className="py-24" id="contacts">
        <div className="mx-auto grid max-w-[100rem] gap-8 px-4 sm:px-6 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="rounded-4xl bg-muted-ui/65 p-8 sm:p-10">
            <h2 className="font-heading text-4xl font-semibold sm:text-5xl">
              Ждем вас в гости
            </h2>
            <div className="mt-8 space-y-6 leading-7">
              <div>
                <p className="text-xs text-muted-ui-foreground">Адрес</p>
                <p className="mt-2">
                  Нижегородская область, 35 км от Н. Новгорода
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-ui-foreground">Телефон</p>
                <a
                  className="mt-2 block font-medium text-brand"
                  href="tel:+79302838828"
                >
                  +7 930 283-88-28
                </a>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-ui-foreground">Заезд</p>
                  <p className="mt-2">с 14:00</p>
                </div>
                <div>
                  <p className="text-xs text-muted-ui-foreground">Выезд</p>
                  <p className="mt-2">до 12:00</p>
                </div>
              </div>
            </div>
            <div className="mt-10 rounded-3xl bg-page p-7">
              <p className="text-xs font-semibold text-brand">
                Фирменный трансфер
              </p>
              <p className="mt-4 leading-7 text-muted-ui-foreground">
                Комфорт-класс с персональной встречей, водой в салоне и
                маршрутом через самые живописные лесные дороги.
              </p>
              <button
                className="mt-6 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-brand-foreground"
                type="button"
              >
                Заказать трансфер
              </button>
            </div>
          </div>
          <iframe
            allowFullScreen
            className="h-full min-h-130 w-full rounded-4xl border-0"
            src="https://yandex.ru/map-widget/v1/?ll=44.113128%2C56.537617&z=16"
            title="Яндекс Карта с отметкой отеля АЛСМА"
          />
        </div>
      </section>

      <section className="px-4 pt-6 pb-24 sm:px-6">
        <div className="relative mx-auto max-w-[100rem] overflow-hidden rounded-4xl px-6 py-12 text-center text-brand-foreground">
          <img
            alt=""
            className="absolute inset-0 size-full object-cover"
            src={ctaImage}
          />
          <div className="absolute inset-0 bg-brand/65" />
          <div className="relative">
            <p className="text-xs font-semibold tracking-widest uppercase opacity-75">
              Поможем выбрать формат отдыха
            </p>
            <h2 className="mt-4 font-heading text-4xl font-semibold sm:text-5xl">
              Планируете отдых в АЛСМЕ?
            </h2>
            <p className="mx-auto mt-6 max-w-4xl text-lg leading-8 opacity-85">
              Оставьте заявку, если хотите забронировать номер или узнать
              подробнее об услугах, SPA, проживании и сценариях отдыха.
            </p>
            <button
              className="mt-8 inline-flex rounded-full bg-brand px-8 py-4 text-sm font-semibold text-brand-foreground"
              onClick={() => setInquiryOpen(true)}
              type="button"
            >
              Подробнее
            </button>
          </div>
        </div>
      </section>
      <HomeInquiryModal
        onClose={() => setInquiryOpen(false)}
        open={inquiryOpen}
      />
    </>
  );
};

type HomeInquiryFormValues = {
  comment: string;
  email: string;
  phone: string;
};

const HomeInquiryModal = ({
  onClose,
  open,
}: {
  readonly onClose: () => void;
  readonly open: boolean;
}) => {
  const lead = useCreateLead();
  const form = useForm<HomeInquiryFormValues>({
    defaultValues: { comment: "", email: "", phone: "" },
  });
  const inputClassName =
    "min-h-16 w-full rounded-2xl border border-booking-line/10 bg-booking-control px-5 py-4 text-page-foreground shadow-sm shadow-page-foreground/5 outline-none placeholder:text-muted-ui-foreground focus:border-booking-line/30 focus:ring-4 focus:ring-focus/10";

  return (
    <Modal
      className="max-w-2xl rounded-4xl bg-booking-shell"
      closeLabel="Закрыть форму заявки"
      headerClassName="items-start px-6 py-8 sm:px-10 sm:py-9"
      headerContent={
        <>
          <p className="text-sm font-semibold tracking-wide text-brand/60">
            Заявка на отдых
          </p>
          <h2 className="mt-4 max-w-2xl font-heading text-3xl leading-[1.08] font-semibold sm:text-4xl">
            Забронировать или узнать подробнее
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-ui-foreground">
            Оставьте контакты, и мы свяжемся с вами, чтобы помочь с
            бронированием и рассказать подробнее о проживании, SPA и услугах
            отеля.
          </p>
        </>
      }
      onClose={onClose}
      open={open}
      title="Забронировать или узнать подробнее"
    >
      <Form
        className="space-y-6"
        form={form}
        onSubmit={(values) => {
          lead.mutate(
            {
              comment: values.comment || undefined,
              email: values.email,
              formCode: "home-inquiry-modal",
              formTitle: "Заявка с сайта — CTA-блок на главной странице",
              phone: values.phone,
              sourcePage: "home",
            },
            { onSuccess: () => form.reset() },
          );
        }}
      >
        <label className="block text-sm font-medium">
          <span className="mb-3 block">Номер</span>
          <input
            className={inputClassName}
            placeholder="+7 (___) ___-__-__"
            type="tel"
            {...form.register("phone", { required: true })}
          />
        </label>
        <label className="block text-sm font-medium">
          <span className="mb-3 block">Почта</span>
          <input
            className={inputClassName}
            placeholder="you@example.com"
            type="email"
            {...form.register("email", { required: true })}
          />
        </label>
        <label className="block text-sm font-medium">
          <span className="mb-3 block">Комментарий</span>
          <textarea
            className="min-h-36 w-full rounded-2xl border border-booking-line/10 bg-booking-control px-5 py-4 text-page-foreground shadow-sm shadow-page-foreground/5 outline-none placeholder:text-muted-ui-foreground focus:border-booking-line/30 focus:ring-4 focus:ring-focus/10"
            placeholder="Напишите, хотите ли вы забронировать номер или узнать подробнее об услугах"
            {...form.register("comment")}
          />
        </label>
        <button
          className="inline-flex min-h-15 w-full items-center justify-center rounded-full bg-brand px-8 py-4 text-sm font-semibold text-brand-foreground transition hover:bg-brand/90 disabled:opacity-60"
          disabled={lead.isPending}
          type="submit"
        >
          {lead.isPending ? <Loader size="sm" /> : "Отправить заявку"}
        </button>
        {lead.isSuccess && (
          <p className="text-center text-sm text-brand">
            Заявка принята. Мы скоро свяжемся с вами.
          </p>
        )}
        {lead.isError && (
          <p className="text-center text-sm text-destructive">
            Не удалось отправить заявку. Попробуйте ещё раз.
          </p>
        )}
      </Form>
    </Modal>
  );
};
