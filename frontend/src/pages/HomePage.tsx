import { Star } from "lucide-react";

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
  type HomeRestCard,
  type HomeReview,
} from "@/lib/site/home-content";
import { ACTIVE_OFFERS, type ActiveOffer } from "@/lib/site/offers";
import { HOME_ROOM_CATEGORIES, type RoomCategory } from "@/lib/site/rooms";
import { usePublishedSiteContent } from "@/lib/site/useSiteContent";

export const HomePage = () => {
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

  return (
    <main className="min-h-screen bg-page text-page-foreground">
      <section className="relative min-h-screen overflow-hidden text-brand-foreground">
        <SiteHeroMedia
          alt="Загородный отель АЛСМА"
          className="absolute inset-0 size-full object-cover"
          source={typeof hero?.image === "string" ? hero.image : heroImage}
        />
        <div className="absolute inset-0 bg-hero-media-tint" />
        <div className="absolute inset-0 bg-hero-highlight" />

        <div className="relative mx-auto flex min-h-screen max-w-[100rem] flex-col px-4 pt-5 pb-10 sm:px-6">
          <SiteHeader bookingTo="#booking" transparentAtTop />

          <div
            className="flex flex-1 flex-col items-center justify-center pt-36 pb-24 text-center"
            id="top"
          >
            <a
              className="mb-6 inline-flex items-center gap-3 rounded-full border border-brand-foreground/15 bg-panel px-5 py-2.5 text-[0.8rem] font-bold tracking-[0.08em] text-brand uppercase transition hover:opacity-90"
              href="https://yandex.ru/maps/org/26910883729"
              rel="noreferrer"
              target="_blank"
            >
              <Star className="size-4 fill-current" />
              4.9 в Яндекс Картах
            </a>
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
