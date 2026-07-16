import { useState } from "react";

import {
  ArrowRight,
  CalendarDays,
  Menu,
  Star,
  UserRound,
  Users,
  X,
} from "lucide-react";

import { AMAZI_ROUTES } from "@/AMAZI_ROUTES";
import heroImage from "@/assets/alsma/hero.jpg";
import logoWhite from "@/assets/alsma/logo-white.svg";
import natureImage from "@/assets/alsma/nature.jpg";
import restaurantImage from "@/assets/alsma/restaurant.jpg";
import roomImage from "@/assets/alsma/room.jpg";
import { useCreateLead } from "@/lib/leads/useCreateLead";

const navigation = [
  "Проживание",
  "SPA",
  "Развлечения",
  "Все включено",
  "О нас",
  "Акции",
];
const cards = [
  {
    image: roomImage,
    label: "Проживание",
    title: "Номера среди соснового леса",
  },
  {
    image: restaurantImage,
    label: "Гастрономия",
    title: "Ресторан и авторская кухня",
  },
  { image: natureImage, label: "Территория", title: "Величественная природа" },
];

export const HomePage = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [checkInDate, setCheckInDate] = useState("2026-07-20");
  const [checkOutDate, setCheckOutDate] = useState("2026-07-23");
  const [guestsCount, setGuestsCount] = useState(2);
  const leadMutation = useCreateLead();

  return (
    <main className="min-h-screen bg-page text-page-foreground">
      <section className="relative min-h-screen overflow-hidden text-brand-foreground">
        <img
          alt="Загородный отель АЛСМА"
          className="absolute inset-0 size-full object-cover"
          src={heroImage}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-page-foreground/30 via-page-foreground/25 to-page-foreground/70" />

        <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-4 pt-5 pb-10 sm:px-6">
          <header className="fixed top-5 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-7xl -translate-x-1/2 items-center justify-between rounded-full border border-brand-foreground/20 bg-page-foreground/15 px-5 py-3 backdrop-blur-md">
            <a aria-label="АЛСМА" href="#top">
              <img
                alt="АЛСМА"
                className="h-10 w-36 object-contain"
                src={logoWhite}
              />
            </a>
            <nav className="hidden items-center gap-6 text-sm font-medium lg:flex">
              {navigation.map((item) => (
                <a
                  className="text-brand-foreground/90 transition hover:text-brand-foreground"
                  href="#rest"
                  key={item}
                >
                  {item}
                </a>
              ))}
            </nav>
            <div className="flex items-center gap-2">
              <a
                aria-label="Личный кабинет"
                className="hidden size-11 place-items-center rounded-full border border-brand-foreground/20 bg-brand-foreground/10 sm:grid"
                href={AMAZI_ROUTES.account}
              >
                <UserRound className="size-5" />
              </a>
              <a
                className="hidden rounded-full bg-brand px-6 py-3 text-sm font-semibold sm:block"
                href="#booking"
              >
                Забронировать
              </a>
              <button
                aria-label="Меню"
                className="grid size-11 place-items-center rounded-full border border-brand-foreground/20 bg-brand-foreground/10 lg:hidden"
                onClick={() => setMenuOpen((value) => !value)}
              >
                {menuOpen ? <X /> : <Menu />}
              </button>
            </div>
            {menuOpen && (
              <nav className="absolute inset-x-0 top-16 flex flex-col gap-3 rounded-3xl bg-brand p-6 lg:hidden">
                {navigation.map((item) => (
                  <a href="#rest" key={item} onClick={() => setMenuOpen(false)}>
                    {item}
                  </a>
                ))}
              </nav>
            )}
          </header>

          <div
            className="flex flex-1 flex-col items-center justify-center pt-36 pb-16 text-center"
            id="top"
          >
            <a
              className="mb-7 inline-flex items-center gap-2 rounded-full bg-panel/90 px-5 py-2.5 text-sm font-bold text-brand"
              href="https://yandex.ru/maps/org/26910883729"
              rel="noreferrer"
              target="_blank"
            >
              <Star className="size-4 fill-current" />
              4.9 в Яндекс Картах
            </a>
            <h1 className="max-w-5xl font-heading text-5xl leading-tight font-semibold sm:text-6xl lg:text-7xl">
              Отдых, который возвращает к себе
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-brand-foreground/85">
              Загородный отель в окружении соснового леса: уютные номера, SPA,
              авторская кухня и настоящее спокойствие.
            </p>
          </div>

          <form
            className="mx-auto grid w-full max-w-5xl gap-3 rounded-3xl border border-brand-foreground/30 bg-panel/90 p-4 text-page-foreground shadow-2xl backdrop-blur sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]"
            id="booking"
            onSubmit={(event) => {
              event.preventDefault();
              leadMutation.mutate({
                checkInDate,
                checkOutDate,
                formCode: "home-booking-widget",
                formTitle: "Подбор номера на главной странице",
                guestsCount,
                sourcePage: "home",
              });
            }}
          >
            <label className="rounded-2xl bg-page px-4 py-3 text-left text-xs font-semibold text-muted-ui-foreground">
              <span className="flex items-center gap-2">
                <CalendarDays className="size-4" />
                Дата заезда
              </span>
              <input
                className="mt-2 w-full bg-transparent text-base text-page-foreground outline-none"
                onChange={(event) => setCheckInDate(event.target.value)}
                type="date"
                value={checkInDate}
              />
            </label>
            <label className="rounded-2xl bg-page px-4 py-3 text-left text-xs font-semibold text-muted-ui-foreground">
              <span className="flex items-center gap-2">
                <CalendarDays className="size-4" />
                Дата выезда
              </span>
              <input
                className="mt-2 w-full bg-transparent text-base text-page-foreground outline-none"
                onChange={(event) => setCheckOutDate(event.target.value)}
                type="date"
                value={checkOutDate}
              />
            </label>
            <label className="rounded-2xl bg-page px-4 py-3 text-left text-xs font-semibold text-muted-ui-foreground">
              <span className="flex items-center gap-2">
                <Users className="size-4" />
                Количество гостей
              </span>
              <select
                className="mt-2 w-full bg-transparent text-base text-page-foreground outline-none"
                onChange={(event) => setGuestsCount(Number(event.target.value))}
                value={guestsCount}
              >
                <option value={1}>1 гость</option>
                <option value={2}>2 гостя</option>
                <option value={3}>3 гостя</option>
                <option value={4}>4 гостя</option>
              </select>
            </label>
            <button
              className="rounded-2xl bg-brand px-8 py-4 font-semibold text-brand-foreground transition hover:bg-brand/90 disabled:opacity-60"
              disabled={leadMutation.isPending}
              type="submit"
            >
              {leadMutation.isPending ? "Отправляем…" : "Найти номер"}
            </button>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6" id="rest">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold tracking-widest text-brand uppercase">
            Отдых в АЛСМА
          </p>
          <h2 className="mt-4 font-heading text-4xl font-semibold sm:text-5xl">
            Всё необходимое, чтобы замедлиться
          </h2>
          <p className="mt-5 text-lg leading-8 text-muted-ui-foreground">
            Пространство, где каждый день наполнен природой, заботой и тёплыми
            впечатлениями.
          </p>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {cards.map((card) => (
            <article
              className="group overflow-hidden rounded-3xl bg-panel shadow-lg"
              key={card.title}
            >
              <div className="h-72 overflow-hidden">
                <img
                  alt={card.title}
                  className="size-full object-cover transition duration-500 group-hover:scale-105"
                  src={card.image}
                />
              </div>
              <div className="p-7">
                <p className="text-xs font-bold tracking-widest text-brand uppercase">
                  {card.label}
                </p>
                <h3 className="mt-3 font-heading text-3xl font-semibold">
                  {card.title}
                </h3>
                <a
                  className="mt-6 inline-flex items-center gap-2 font-semibold text-brand"
                  href="#booking"
                >
                  Подробнее <ArrowRight className="size-4" />
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
};
