import { Star } from "lucide-react";

import corporateCheckinsImage from "@/assets/alsma/corporate-checkins.jpg";
import heroImage from "@/assets/alsma/hero.jpg";
import { HomeBookingBar } from "@/components/site/HomeBookingBar";
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
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteHeroMedia } from "@/components/site/SiteHeroMedia";
import { SocialLinksSection } from "@/components/site/SocialLinksSection";
import { getSiteCollection } from "@/lib/site/content-collections";
import {
  HOME_REST_CARDS,
  HOME_REVIEWS,
  type HomeReview,
} from "@/lib/site/home-content";
import {
  ACTIVE_OFFERS,
  type ActiveOffer,
  READY_SCENARIOS,
  type ReadyScenario,
} from "@/lib/site/offers";
import { getRoomCards } from "@/lib/site/rooms-content";
import { usePublishedSiteContent } from "@/lib/site/useSiteContent";

export const HomePage = () => {
  const content = usePublishedSiteContent("home");
  const roomsContent = usePublishedSiteContent("rooms");
  const offersContent = usePublishedSiteContent("offers");
  if (content.isLoading || roomsContent.isLoading || offersContent.isLoading) {
    return <main className="min-h-screen bg-page" aria-busy="true" />;
  }
  const hero = content.data?.items?.find(
    (item) => item.itemKey === "hero",
  )?.content;
  const configuredRestCards = getSiteCollection<ReadyScenario>(
    offersContent.data?.items,
    "ready-scenarios",
    READY_SCENARIOS,
  );
  const corporateCard = HOME_REST_CARDS.find((item) =>
    item.title.toLocaleLowerCase().includes("корпоратив"),
  );
  const restCards = [
    ...configuredRestCards,
    ...(corporateCard &&
    !configuredRestCards.some((item) =>
      item.title.toLocaleLowerCase().includes("корпоратив"),
    )
      ? [
          {
            ...corporateCard,
            image: corporateCheckinsImage,
            buttonLink: corporateCard.href,
          },
        ]
      : []),
  ]
    .filter((item) => item.isActive !== false)
    .sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0))
    .map((item) => ({
      ...item,
      href: item.buttonLink,
      image: item.title.toLocaleLowerCase().includes("корпоратив")
        ? corporateCheckinsImage
        : item.image,
    }));
  const reviews = getSiteCollection<HomeReview>(
    content.data?.items,
    "reviews",
    HOME_REVIEWS,
  )
    .filter((item) => item.isActive !== false)
    .sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0));
  const rooms = getRoomCards(roomsContent.data?.items)
    .filter((room) => room.isActive !== false)
    .sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0));
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
          poster={
            typeof hero?.posterUrl === "string" ? hero.posterUrl : undefined
          }
          source={
            typeof hero?.mediaUrl === "string"
              ? hero.mediaUrl
              : typeof hero?.image === "string"
                ? hero.image
                : heroImage
          }
        />
        <div className="absolute inset-0 bg-hero-media-tint" />
        <div className="absolute inset-0 bg-hero-highlight" />

        <div className="relative mx-auto flex min-h-screen max-w-[100rem] flex-col px-4 pt-5 pb-10 sm:px-6">
          <SiteHeader transparentAtTop />

          <div
            className="flex flex-1 flex-col items-center justify-center pt-36 pb-24 text-center"
            id="top"
          >
            <div className="mb-6 flex flex-wrap items-center justify-center gap-3">
              <a
                className="inline-flex items-center gap-3 rounded-full border border-brand-foreground/15 bg-panel px-5 py-2.5 text-[0.8rem] font-bold tracking-[0.08em] text-page-foreground uppercase transition hover:opacity-90"
                href="https://yandex.ru/maps/org/26910883729"
                rel="noreferrer"
                target="_blank"
              >
                <Star className="size-4 fill-current text-orange-500" />
                4.9 в Яндекс Картах
              </a>
              <span className="inline-flex items-center gap-2 rounded-full border border-brand-foreground/15 bg-panel px-5 py-2.5 text-[0.8rem] font-bold tracking-[0.08em] text-page-foreground uppercase">
                4
                <Star
                  aria-hidden="true"
                  className="size-4 fill-current text-orange-500"
                />
                Загородный спа-отель премиум класса
              </span>
            </div>
            <h1 className="max-w-4xl font-heading text-4xl leading-[1.02] font-semibold sm:text-5xl md:text-6xl lg:text-7xl">
              {typeof hero?.title === "string"
                ? hero.title
                : "Отдых, который возвращает к себе"}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-brand-foreground/85 sm:mt-8">
              {typeof hero?.description === "string"
                ? hero.description
                : "Загородный отель в окружении соснового леса: уютные номера, SPA, авторская кухня и настоящее спокойствие."}
            </p>
          </div>

          <HomeBookingBar />
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
