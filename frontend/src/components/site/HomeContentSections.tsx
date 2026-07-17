import { ArrowRight, Star } from "lucide-react";

import { AMAZI_ROUTES } from "@/AMAZI_ROUTES";
import type { HomeRestCard, HomeReview } from "@/lib/site/home-content";
import type { ActiveOffer } from "@/lib/site/offers";
import type { RoomCategory } from "@/lib/site/rooms";

export const HomeRestSection = ({
  cards,
}: {
  readonly cards: readonly HomeRestCard[];
}) => (
  <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6" id="rest">
    <div className="mx-auto max-w-3xl text-center">
      <p className="text-sm font-bold tracking-widest text-brand uppercase">
        Отдых в АЛСМА
      </p>
      <h2 className="mt-4 font-heading text-4xl font-semibold sm:text-5xl">
        Каким будет ваш идеальный отдых!
      </h2>
      <p className="mt-5 text-lg leading-8 text-muted-ui-foreground">
        Ваш личный сценарий отдыха, который объединит wellness-процедуры,
        гастрономию и первозданность реликтового леса.
      </p>
    </div>
    <div className="mt-14 grid gap-6 md:grid-cols-2">
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
            <div className="flex flex-wrap gap-2">
              {card.tags.map((tag) => (
                <span
                  className="rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand"
                  key={tag}
                >
                  {tag}
                </span>
              ))}
            </div>
            <h3 className="mt-4 font-heading text-3xl font-semibold">
              {card.title}
            </h3>
            <p className="mt-3 leading-7 text-muted-ui-foreground">
              {card.description}
            </p>
            <div className="mt-6 flex items-center justify-between gap-4">
              <strong className="text-lg text-brand">{card.price}</strong>
              <a
                className="inline-flex items-center gap-2 font-semibold text-brand"
                href={card.href ?? "#booking"}
              >
                Подробнее <ArrowRight className="size-4" />
              </a>
            </div>
          </div>
        </article>
      ))}
    </div>
  </section>
);

export const HomePromotionsSection = ({
  offers,
}: {
  readonly offers: readonly ActiveOffer[];
}) => (
  <section className="bg-panel py-24" id="offers">
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold tracking-widest text-brand uppercase">
          Акции и спецпредложения
          </p>
          <h2 className="mt-4 font-heading text-4xl font-semibold sm:text-5xl">
            Выберите предложение под ваш формат отдыха
          </h2>
        </div>
        <a
          className="inline-flex items-center gap-2 font-semibold text-brand"
          href={AMAZI_ROUTES.offers}
        >
          Все предложения <ArrowRight className="size-4" />
        </a>
      </div>
      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {offers.map((offer) => (
          <article
            className="group relative min-h-96 overflow-hidden rounded-3xl text-brand-foreground"
            key={offer.title}
          >
            <img
              alt={offer.title}
              className="absolute inset-0 size-full object-cover transition duration-500 group-hover:scale-105"
              src={offer.image}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-page-foreground/90 via-page-foreground/30 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-7">
              <span className="rounded-full bg-panel px-4 py-2 text-sm font-semibold text-brand">
                {offer.tag}
              </span>
              <h3 className="mt-5 font-heading text-3xl font-semibold">
                {offer.title}
              </h3>
              <p className="mt-3 text-brand-foreground/80">
                {offer.description}
              </p>
            </div>
          </article>
        ))}
      </div>
    </div>
  </section>
);

export const HomeReviewsSection = ({
  reviews,
}: {
  readonly reviews: readonly HomeReview[];
}) => (
  <section className="bg-brand px-4 py-24 text-brand-foreground sm:px-6">
    <div className="mx-auto max-w-7xl">
      <p className="text-sm font-bold tracking-widest uppercase opacity-70">
        Отзывы гостей
      </p>
      <h2 className="mt-4 max-w-2xl font-heading text-4xl font-semibold sm:text-5xl">
        Впечатления, которыми хочется поделиться
      </h2>
      <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {reviews.map((review) => (
          <article
            className="rounded-3xl bg-brand-foreground/10 p-6"
            key={`${review.source}:${review.name}`}
          >
            <Star className="size-5 fill-current" />
            <p className="mt-5 leading-7">{review.text}</p>
            <p className="mt-6 font-semibold">{review.name}</p>
            <p className="text-sm opacity-70">{review.source}</p>
          </article>
        ))}
      </div>
    </div>
  </section>
);

export const HomeRoomsSection = ({
  rooms,
}: {
  readonly rooms: readonly RoomCategory[];
}) => (
  <section className="bg-panel py-24" id="rooms">
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold tracking-widest text-brand uppercase">
            Проживание
          </p>
          <h2 className="mt-4 font-heading text-4xl font-semibold sm:text-5xl">
            Уют, скрытый в кронах сосен
          </h2>
        </div>
        <a
          className="inline-flex items-center gap-2 font-semibold text-brand"
          href={AMAZI_ROUTES.rooms}
        >
          Все номера <ArrowRight className="size-4" />
        </a>
      </div>
      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {rooms.map((room) => (
          <article
            className="overflow-hidden rounded-3xl bg-page shadow-lg"
            key={room.title}
          >
            <img
              alt={room.title}
              className="h-64 w-full object-cover"
              src={room.image}
            />
            <div className="p-6">
              <div className="flex flex-wrap gap-2 text-xs font-semibold text-brand">
                <span>{room.area}</span>
                <span>·</span>
                <span>{room.capacity}</span>
              </div>
              <h3 className="mt-3 font-heading text-3xl font-semibold">
                {room.title}
              </h3>
              <p className="mt-3 line-clamp-3 leading-7 text-muted-ui-foreground">
                {room.description}
              </p>
              <p className="mt-5 text-lg font-semibold text-brand">
                {room.price} / ночь
              </p>
            </div>
          </article>
        ))}
      </div>
    </div>
  </section>
);
