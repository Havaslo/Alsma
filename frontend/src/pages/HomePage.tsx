import { useState } from "react";

import { CalendarDays, Menu, Star, UserRound, Users, X } from "lucide-react";

import { AMAZI_ROUTES } from "@/AMAZI_ROUTES";
import heroImage from "@/assets/alsma/hero.jpg";
import logoWhite from "@/assets/alsma/logo-white.svg";
import {
  HomePromotionsSection,
  HomeRestSection,
  HomeReviewsSection,
  HomeRoomsSection,
} from "@/components/site/HomeContentSections";
import {
  HomeContactSections,
  HomeExperienceSections,
} from "@/components/site/HomeDiscoverySections";
import { SiteHeroMedia } from "@/components/site/SiteHeroMedia";
import { useCreateLead } from "@/lib/leads/useCreateLead";
import { getSiteCollection } from "@/lib/site/content-collections";
import {
  HOME_REST_CARDS,
  HOME_REVIEWS,
  type HomeRestCard,
  type HomeReview,
} from "@/lib/site/home-content";
import { ACTIVE_OFFERS, type ActiveOffer } from "@/lib/site/offers";
import { ROOM_CATEGORIES, type RoomCategory } from "@/lib/site/rooms";
import { usePublishedSiteContent } from "@/lib/site/useSiteContent";

const navigation = [
  { href: AMAZI_ROUTES.rooms, label: "Проживание" },
  { href: AMAZI_ROUTES.spa, label: "SPA" },
  { href: AMAZI_ROUTES.entertainment, label: "Развлечения" },
  { href: AMAZI_ROUTES.allInclusive, label: "Все включено" },
  { href: AMAZI_ROUTES.about, label: "О нас" },
  { href: AMAZI_ROUTES.offers, label: "Акции" },
];
export const HomePage = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [checkInDate, setCheckInDate] = useState("2026-07-20");
  const [checkOutDate, setCheckOutDate] = useState("2026-07-23");
  const [guestsCount, setGuestsCount] = useState(2);
  const leadMutation = useCreateLead();
  const content = usePublishedSiteContent("home");
  const roomsContent = usePublishedSiteContent("rooms");
  const offersContent = usePublishedSiteContent("offers");
  const hero = content.data?.items.find(
    (item) => item.itemKey === "hero",
  )?.content;
  const restCards = getSiteCollection<HomeRestCard>(
    content.data?.items,
    "ideal-rest",
    HOME_REST_CARDS,
  );
  const reviews = getSiteCollection<HomeReview>(
    content.data?.items,
    "reviews",
    HOME_REVIEWS,
  );
  const rooms = getSiteCollection<RoomCategory>(
    roomsContent.data?.items,
    "cards",
    ROOM_CATEGORIES,
  );
  const offers = getSiteCollection<ActiveOffer>(
    offersContent.data?.items,
    "proposals",
    ACTIVE_OFFERS,
  );

  return (
    <main className="min-h-screen bg-page text-page-foreground">
      <section className="relative min-h-screen overflow-hidden text-brand-foreground">
        <SiteHeroMedia
          alt="Загородный отель АЛСМА"
          className="absolute inset-0 size-full object-cover"
          source={typeof hero?.image === "string" ? hero.image : heroImage}
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
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
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
                  <a
                    href={item.href}
                    key={item.href}
                    onClick={() => setMenuOpen(false)}
                  >
                    {item.label}
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
              {typeof hero?.title === "string"
                ? hero.title
                : "Отдых, который возвращает к себе"}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-brand-foreground/85">
              {typeof hero?.description === "string"
                ? hero.description
                : "Загородный отель в окружении соснового леса: уютные номера, SPA, авторская кухня и настоящее спокойствие."}
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

      <HomePromotionsSection offers={offers} />
      <section className="pb-24">
        <div className="mx-auto grid max-w-7xl gap-8 rounded-4xl bg-panel px-8 py-10 sm:px-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold tracking-widest text-brand uppercase">Следите за нами в соц сетях</p>
            <h2 className="mt-3 font-heading text-3xl font-semibold text-brand sm:text-4xl">Узнавайте первыми о новых акциях, событиях и красивых моментах отдыха в АЛСМА</h2>
            <p className="mt-4 leading-7 text-muted-ui-foreground">Публикуем специальные предложения, новости отеля, анонсы заездов и атмосферные кадры из лесного SPA-отдыха.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["ВКонтакте", "https://vk.com/alsma_nnov"],
              ["Telegram", "https://t.me/alsma_hotel"],
              ["MAX", "https://web.max.ru/158586418"],
              ["YouTube", "https://youtube.com"],
            ].map(([label, href]) => <a className="flex items-center justify-between rounded-3xl bg-page px-5 py-4 font-semibold text-brand" href={href} key={label} rel="noreferrer" target="_blank">{label}<span>↗</span></a>)}
          </div>
        </div>
      </section>
      <HomeRestSection cards={restCards} />
      <HomeRoomsSection rooms={rooms} />
      <HomeExperienceSections />
      <HomeReviewsSection reviews={reviews} />
      <HomeContactSections />
    </main>
  );
};
