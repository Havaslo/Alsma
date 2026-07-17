import { useEffect, useState } from "react";

import {
  CalendarDays,
  ChevronDown,
  Menu,
  Star,
  UserRound,
  Users,
  X,
} from "lucide-react";

import { AMAZI_ROUTES } from "@/AMAZI_ROUTES";
import heroImage from "@/assets/alsma/hero.jpg";
import logoGreen from "@/assets/alsma/logo-green.svg";
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
import { SocialLinksSection } from "@/components/site/SocialLinksSection";
import { useCreateLead } from "@/lib/leads/useCreateLead";
import { getSiteCollection } from "@/lib/site/content-collections";
import {
  HOME_REST_CARDS,
  HOME_REVIEWS,
  type HomeRestCard,
  type HomeReview,
} from "@/lib/site/home-content";
import { ACTIVE_OFFERS, type ActiveOffer } from "@/lib/site/offers";
import { HOME_ROOM_CATEGORIES, type RoomCategory } from "@/lib/site/rooms";
import { usePublishedSiteContent } from "@/lib/site/useSiteContent";

const navigation = [
  { href: AMAZI_ROUTES.rooms, label: "Проживание" },
  { href: AMAZI_ROUTES.spa, label: "SPA" },
  { href: AMAZI_ROUTES.entertainment, label: "Развлечения" },
  { href: AMAZI_ROUTES.allInclusive, label: "Все включено" },
  { href: AMAZI_ROUTES.about, label: "О нас" },
  { href: AMAZI_ROUTES.offers, label: "Акции" },
];
const moreNavigation = [
  { href: AMAZI_ROUTES.hardwareProcedures, label: "Аппаратные процедуры" },
  { href: AMAZI_ROUTES.news, label: "Новости" },
  { href: AMAZI_ROUTES.blog, label: "Блог" },
  { href: AMAZI_ROUTES.celebrations, label: "Торжества" },
];
export const HomePage = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [headerScrolled, setHeaderScrolled] = useState(false);
  const [checkInDate, setCheckInDate] = useState("2026-06-12");
  const [checkOutDate, setCheckOutDate] = useState("2026-06-15");
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
    HOME_ROOM_CATEGORIES,
  );
  const offers = getSiteCollection<ActiveOffer>(
    offersContent.data?.items,
    "proposals",
    ACTIVE_OFFERS,
  );

  useEffect(() => {
    const updateHeader = () => setHeaderScrolled(window.scrollY > 32);

    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });
    return () => window.removeEventListener("scroll", updateHeader);
  }, []);

  return (
    <main className="min-h-screen bg-page text-page-foreground">
      <section className="relative min-h-screen overflow-hidden text-brand-foreground">
        <SiteHeroMedia
          alt="Загородный отель АЛСМА"
          className="absolute inset-0 size-full object-cover"
          source={typeof hero?.image === "string" ? hero.image : heroImage}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-page-foreground/30 via-page-foreground/25 to-page-foreground/70" />

        <div className="relative mx-auto flex min-h-screen max-w-[100rem] flex-col px-4 pt-5 pb-10 sm:px-6">
          <header
            className={`fixed top-4 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-7xl -translate-x-1/2 items-center justify-between rounded-full border px-5 py-4 backdrop-blur-sm transition duration-300 ${headerScrolled ? "border-brand/10 bg-page text-brand shadow-xl" : "border-brand-foreground/15 bg-brand-foreground/5 text-brand-foreground"}`}
          >
            <a aria-label="АЛСМА" href="#top">
              <img
                alt="АЛСМА"
                className="h-10 w-36 object-contain"
                src={headerScrolled ? logoGreen : logoWhite}
              />
            </a>
            <nav className="hidden items-center gap-5 text-base font-medium lg:flex xl:gap-7 xl:text-lg 2xl:gap-8">
              {navigation.map((item) => (
                <a
                  className={headerScrolled ? "text-brand transition hover:text-brand/75" : "text-brand-foreground/90 transition hover:text-brand-foreground"}
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                </a>
              ))}
              <div className="group relative">
                <button className={`flex items-center gap-1 py-3 ${headerScrolled ? "text-brand" : "text-brand-foreground/90"}`} type="button">Еще <ChevronDown className="size-4" /></button>
                <div className="invisible absolute top-full right-0 w-72 translate-y-2 rounded-3xl bg-page p-3 text-brand opacity-0 shadow-xl transition group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                  {moreNavigation.map((item) => <a className="block rounded-2xl px-4 py-3 hover:bg-panel" href={item.href} key={item.href}>{item.label}</a>)}
                </div>
              </div>
            </nav>
            <div className="flex items-center gap-2">
              <a
                aria-label="Личный кабинет"
                className={`hidden size-12 place-items-center rounded-full border sm:grid ${headerScrolled ? "border-brand/15 bg-panel text-brand" : "border-brand-foreground/20 bg-brand-foreground/10 text-brand-foreground"}`}
                href={AMAZI_ROUTES.account}
              >
                <span className={`grid size-9 place-items-center rounded-full border ${headerScrolled ? "border-brand/10 bg-page" : "border-brand-foreground/15 bg-brand-foreground/10"}`}>
                  <UserRound className="size-5" />
                </span>
              </a>
              <a
                className="hidden rounded-full bg-brand px-6 py-3 text-sm font-semibold sm:block"
                href="#booking"
              >
                Забронировать
              </a>
              <button
                aria-label="Меню"
                className={`grid size-11 place-items-center rounded-full border lg:hidden ${headerScrolled ? "border-brand/15 bg-panel text-brand" : "border-brand-foreground/20 bg-brand-foreground/10 text-brand-foreground"}`}
                onClick={() => setMenuOpen((value) => !value)}
              >
                {menuOpen ? <X /> : <Menu />}
              </button>
            </div>
            {menuOpen && (
              <nav className="absolute inset-x-0 top-16 flex flex-col gap-3 rounded-3xl bg-brand p-6 lg:hidden">
                {[...navigation, ...moreNavigation].map((item) => (
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
            <h1 className="max-w-5xl font-heading text-4xl leading-tight font-semibold sm:text-5xl md:text-6xl lg:text-7xl">
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
      <SocialLinksSection
        description="Публикуем специальные предложения, новости отеля, анонсы заездов и атмосферные кадры из лесного SPA-отдыха."
        title="Узнавайте первыми о новых акциях, событиях и красивых моментах отдыха в АЛСМА"
      />
      <HomeRestSection cards={restCards} />
      <HomeRoomsSection rooms={rooms} />
      <HomeExperienceSections />
      <HomeReviewsSection reviews={reviews} />
      <HomeContactSections />
    </main>
  );
};
