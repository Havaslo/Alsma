import { useState } from "react";

import { ArrowRight, Star } from "lucide-react";

import { HorizontalCarousel } from "@/components/site/HorizontalCarousel";
import { RoomRecommendationQuiz } from "@/components/site/RoomRecommendationQuiz";
import type { HomeRestCard, HomeReview } from "@/lib/site/home-content";
import { resolveMediaUrl } from "@/lib/site/media-url";
import type { ActiveOffer } from "@/lib/site/offers";
import type { RoomCategory } from "@/lib/site/rooms";
import { ROUTES } from "@/route-constants";

export const HomeRestSection = ({
  cards,
}: {
  readonly cards: readonly HomeRestCard[];
}) => (
  <section className="mx-auto max-w-[100rem] px-4 py-24 sm:px-6" id="rest">
    <div className="mx-auto max-w-3xl text-center">
      <h2 className="font-heading text-4xl font-semibold sm:text-5xl">
        Каким будет ваш идеальный отдых!
      </h2>
      <p className="mt-5 text-lg leading-8 text-muted-ui-foreground">
        Ваш личный сценарий отдыха, который объединит wellness-процедуры,
        гастрономию и первозданность реликтового леса.
      </p>
    </div>
    <HorizontalCarousel className="mt-12">
      {cards.map((card) => (
        <article
          className="group grid h-full overflow-hidden rounded-4xl bg-panel lg:grid-cols-[0.9fr_1.1fr]"
          key={card.title}
        >
          <div className="order-2 flex flex-col p-8 sm:p-10 lg:order-1">
            <h3 className="font-heading text-4xl font-semibold">
              {card.title}
            </h3>
            <p className="mt-4 leading-7 text-muted-ui-foreground">
              {card.description}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {card.tags.map((tag) => (
                <span
                  className="rounded-full border border-line bg-page/40 px-4 py-2 text-sm font-semibold text-brand"
                  key={tag}
                >
                  {tag}
                </span>
              ))}
            </div>
            <div className="mt-auto flex flex-col items-start gap-4 pt-8 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <span className="text-sm text-muted-ui-foreground">
                  Стоимость программы
                </span>
                <strong className="mt-2 block text-3xl">{card.price}</strong>
              </div>
              <a
                className="inline-flex rounded-full bg-brand px-7 py-4 font-semibold text-brand-foreground"
                href={card.href ?? "#booking"}
              >
                Подробнее
              </a>
            </div>
          </div>
          <div className="order-1 h-80 overflow-hidden lg:order-2 lg:h-140">
            <img
              alt={card.title}
              className="size-full object-cover transition duration-500 group-hover:scale-105"
              src={resolveMediaUrl(card.image)}
            />
          </div>
        </article>
      ))}
    </HorizontalCarousel>
  </section>
);

export const HomePromotionsSection = ({
  offers,
}: {
  readonly offers: readonly ActiveOffer[];
}) => (
  <section className="py-24" id="offers">
    <div className="mx-auto max-w-[100rem] px-4 sm:px-6">
      <div className="mx-auto max-w-3xl text-center">
        <div>
          <p className="text-sm font-bold tracking-widest text-brand uppercase">
            Акции и спецпредложения
          </p>
          <h2 className="mt-4 font-heading text-4xl font-semibold sm:text-5xl">
            Выберите предложение под ваш формат отдыха
          </h2>
        </div>
        <p className="mt-5 text-lg leading-8 text-muted-ui-foreground">
          Семейные заезды, выгодные будни и специальные условия для тех, кто
          хочет остаться дольше.
        </p>
      </div>
      <HorizontalCarousel className="mt-14" slideClassName="basis-auto">
        {offers.map((offer) => (
          <a
            className="group block h-full min-h-[568px] w-[300px] overflow-hidden rounded-4xl bg-brand text-brand-foreground transition outline-none hover:-translate-y-1 focus-visible:ring-4 focus-visible:ring-focus/30 sm:w-[340px] lg:w-[360px]"
            href={offer.buttonLink || ROUTES.offers}
            key={offer.title}
          >
            <div className="h-56 overflow-hidden">
              <img
                alt={offer.title}
                className="size-full object-cover transition duration-500 group-hover:scale-105"
                src={resolveMediaUrl(offer.image)}
              />
            </div>
            <div className="p-7">
              <span className="rounded-full border border-brand-foreground/20 bg-brand-foreground/10 px-3 py-1.5 text-xs font-semibold uppercase">
                {offer.tag}
              </span>
              <h3 className="mt-4 font-heading text-3xl font-semibold">
                {offer.title}
              </h3>
              <p className="mt-3 text-brand-foreground/80">
                {offer.description}
              </p>
              <span className="mt-6 inline-flex items-center gap-2 font-semibold text-accent-ui">
                Подробнее <ArrowRight className="size-4" />
              </span>
            </div>
          </a>
        ))}
      </HorizontalCarousel>
      <div className="mt-8 text-center">
        <a
          className="inline-flex items-center gap-2 rounded-full bg-brand px-8 py-4 font-semibold text-brand-foreground"
          href={ROUTES.offers}
        >
          Все акции <ArrowRight className="size-4" />
        </a>
      </div>
    </div>
  </section>
);

export const HomeReviewsSection = ({
  reviews,
}: {
  readonly reviews: readonly HomeReview[];
}) => (
  <section className="px-4 py-8 sm:px-6">
    <div className="mx-auto max-w-[100rem]">
      <h2 className="text-center font-heading text-4xl font-semibold sm:text-5xl">
        Истории вашего отдыха
      </h2>
      <p className="mt-8 text-center text-lg text-muted-ui-foreground">
        Общий рейтинг{" "}
        <Star
          aria-hidden="true"
          className="mr-1 inline-block size-5 fill-accent-ui align-[-0.15em] text-accent-ui"
        />
        <strong className="text-page-foreground">4.9</strong> ·{" "}
        <strong className="text-page-foreground">1200+ отзывов</strong>
      </p>
      <HorizontalCarousel
        className="mt-12"
        slideClassName="basis-5/6 sm:basis-1/2 lg:basis-1/3 2xl:basis-1/4"
      >
        {reviews.map((review) => (
          <article
            className="flex min-h-[342px] flex-col rounded-4xl bg-panel p-7"
            key={`${review.source}:${review.name}`}
          >
            <div className="flex items-center justify-between">
              <span className="tracking-widest text-accent-ui">★★★★★</span>
              <span className="rounded-full border border-line px-3 py-1 text-xs text-muted-ui-foreground">
                {review.source}
              </span>
            </div>
            <p className="mt-5 leading-7">{review.text}</p>
            {(review.images?.length || review.image) && (
              <div className="mt-6 flex flex-wrap gap-2">
                {[
                  ...(review.images ?? []),
                  ...(review.image ? [review.image] : []),
                ]
                  .filter(
                    (image, index, images) => images.indexOf(image) === index,
                  )
                  .map((image, index) => (
                    <img
                      alt={`Фото к отзыву ${review.name} ${index + 1}`}
                      className="size-16 rounded-2xl object-cover"
                      key={image}
                      src={resolveMediaUrl(image)}
                    />
                  ))}
              </div>
            )}
            <div className="mt-auto pt-6">
              <p className="font-semibold">{review.name}</p>
            </div>
          </article>
        ))}
      </HorizontalCarousel>
    </div>
  </section>
);

export const HomeRoomsSection = ({
  rooms,
}: {
  readonly rooms: readonly RoomCategory[];
}) => {
  const [quizOpen, setQuizOpen] = useState(false);

  return (
    <section className="bg-page py-24" id="rooms">
      <div className="mx-auto max-w-[100rem] px-4 sm:px-6">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="font-heading text-4xl font-semibold sm:text-5xl">
            Уют, скрытый в кронах сосен
          </h2>
          <p className="mt-5 text-lg leading-8 text-muted-ui-foreground">
            Современные интерьеры номеров и красота леса за панорамными окнами —
            идеальное сочетание для любого варианта отдыха.
          </p>
        </div>
        <HorizontalCarousel
          className="mt-12"
          slideClassName="basis-5/6 sm:basis-1/2 lg:basis-1/3 2xl:basis-1/4"
        >
          {rooms.map((room) => (
            <article
              className="flex h-full flex-col overflow-hidden rounded-4xl bg-panel"
              key={room.title}
            >
              <img
                alt={room.title}
                className="h-64 w-full object-cover"
                src={resolveMediaUrl(room.image)}
              />
              <div className="flex flex-1 flex-col p-6">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-line bg-page/40 px-4 py-2 text-xs font-semibold text-brand">
                    {room.area}
                  </span>
                  <span className="rounded-full border border-line bg-page/40 px-4 py-2 text-xs font-semibold text-brand">
                    {room.capacity}
                  </span>
                </div>
                <h3 className="mt-3 font-heading text-3xl font-semibold">
                  {room.title}
                </h3>
                <p className="mt-3 line-clamp-3 leading-7 text-muted-ui-foreground">
                  {room.description}
                </p>
                <p className="mt-auto pt-5 text-lg font-semibold text-brand">
                  {room.price} / ночь
                </p>
                <a
                  className="mt-5 inline-flex justify-center rounded-full bg-brand px-5 py-3 text-sm font-semibold text-brand-foreground"
                  href={room.homeButtonHref ?? ROUTES.rooms}
                >
                  {room.homeButtonLabel ?? "Подробнее"}
                </a>
              </div>
            </article>
          ))}
        </HorizontalCarousel>
        <div className="mx-auto mt-14 max-w-5xl text-center">
          <h3 className="font-heading text-3xl font-semibold">AI-консьерж</h3>
          <p className="mt-4 text-lg leading-8 text-muted-ui-foreground">
            Не знаете, какой номер выбрать? Подберем лучший формат отдыха по
            составу гостей, сценарию поездки и желаемому уровню приватности.
          </p>
          <button
            className="mt-7 inline-flex rounded-full bg-page-foreground px-7 py-4 font-semibold text-page"
            onClick={() => setQuizOpen(true)}
            type="button"
          >
            Спросить AI
          </button>
        </div>
        <RoomRecommendationQuiz
          onClose={() => setQuizOpen(false)}
          open={quizOpen}
          rooms={rooms}
        />
      </div>
    </section>
  );
};
