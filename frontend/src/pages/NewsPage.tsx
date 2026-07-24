import { useState } from "react";

import musicImage from "@/assets/alsma/entertainment-live-music.png";
import heroImage from "@/assets/alsma/spa-forest-walk.jpg";
import programsImage from "@/assets/alsma/spa-programs.jpg";
import riverImage from "@/assets/alsma/spa-river-aerial.jpg";
import { EditorialCard } from "@/components/site/EditorialCard";
import { PublicHero } from "@/components/site/PublicHero";
import { SiteHeader } from "@/components/site/SiteHeader";
import { getSiteCollection } from "@/lib/site/content-collections";
import { type EditorialItem, NEWS_ITEMS } from "@/lib/site/editorial";
import { PUBLIC_PAGES } from "@/lib/site/public-pages";
import { usePublishedSiteContent } from "@/lib/site/useSiteContent";

const filters = [
  ["all", "Все новости"],
  ["arrivals", "Тематические заезды"],
  ["wellness", "Wellness-программы"],
  ["events", "Мероприятия"],
] as const;

const upcomingEvents = [
  {
    date: "12 октября 2026",
    description:
      "Камерный ужин с сезонным меню от шефа, сопровождением и живой музыкой в уютной вечерней атмосфере.",
    href: "https://t.me/alsma_hotel",
    image: musicImage,
    tag: "Популярно",
    title: "Гастроужин «Вкус сезона»",
  },
  {
    date: "22 октября 2026",
    description:
      "Практики мягкого восстановления, полезный brunch, лекция о ресурсном состоянии и персональные рекомендации.",
    href: "https://vk.com/alsma_nnov",
    image: programsImage,
    tag: "Новый формат",
    title: "Wellness day с лекцией эксперта",
  },
  {
    date: "3 ноября 2026",
    description:
      "Активности на природе, детская программа, пикник и спокойный вечерний отдых для всей семьи.",
    href: "https://t.me/alsma_hotel",
    image: riverImage,
    tag: "Для всей семьи",
    title: "Семейный weekend у реки",
  },
] as const;

export const NewsPage = () => {
  const [filter, setFilter] = useState("all");
  const page = PUBLIC_PAGES.news;
  const content = usePublishedSiteContent("news");
  const hero = content.data?.items.find(
    (item) => item.itemKey === "hero",
  )?.content;
  const newsItems = [
    ...getSiteCollection<EditorialItem>(
      content.data?.items,
      "items",
      NEWS_ITEMS,
    ),
  ]
    .filter((item) => item.isActive !== false && item.isArchived !== true)
    .sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0));
  const items =
    filter === "all"
      ? newsItems
      : newsItems.filter((item) => item.category === filter);

  return (
    <main className="min-h-screen bg-page text-page-foreground">
      <SiteHeader />
      <PublicHero
        description={
          typeof hero?.description === "string"
            ? hero.description
            : page.description
        }
        eyebrow="Актуальное в отеле АЛСМА"
        image={typeof hero?.image === "string" ? hero.image : heroImage}
        title={
          typeof hero?.title === "string" ? hero.title : "Новости и события"
        }
      />
      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8" id="details">
        <div className="text-center">
          <p className="text-sm font-semibold tracking-widest text-brand uppercase">
            Лента обновлений
          </p>
          <h2 className="mt-4 font-heading text-4xl font-semibold sm:text-5xl">
            Новости отеля
          </h2>
        </div>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {filters.map(([value, label]) => (
            <button
              className={`rounded-full border px-5 py-3 font-semibold ${filter === value ? "border-brand bg-brand text-brand-foreground" : "border-line bg-panel"}`}
              key={value}
              onClick={() => setFilter(value)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-12 grid gap-7 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <EditorialCard item={item} key={item.title} />
          ))}
        </div>
      </section>
      <section className="bg-panel/70 py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-sm font-semibold tracking-widest text-brand uppercase">
              Ближайшие форматы
            </p>
            <h2 className="mt-4 font-heading text-4xl font-semibold sm:text-5xl">
              Мероприятия
            </h2>
            <p className="mt-5 text-lg leading-8 text-muted-ui-foreground">
              Подборка событий, которые можно сохранить себе и посмотреть в
              социальных сетях отеля.
            </p>
          </div>
          <div className="mt-12 space-y-5">
            {upcomingEvents.map((event) => (
              <article
                className="overflow-hidden rounded-4xl border border-line bg-page lg:grid lg:grid-cols-[22.5rem_1fr]"
                key={event.title}
              >
                <img
                  alt={event.title}
                  className="size-full h-72 object-cover lg:h-full"
                  src={event.image}
                />
                <div className="flex flex-col p-7 sm:p-8">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-supporting/30 px-4 py-2 text-sm font-semibold text-brand">
                      {event.tag}
                    </span>
                    <span className="text-sm text-muted-ui-foreground">
                      {event.date}
                    </span>
                  </div>
                  <h3 className="mt-5 font-heading text-3xl font-semibold text-brand">
                    {event.title}
                  </h3>
                  <p className="mt-4 max-w-3xl leading-7 text-muted-ui-foreground">
                    {event.description}
                  </p>
                  <a
                    className="mt-7 inline-flex w-fit rounded-full border border-brand px-6 py-3 font-semibold text-brand"
                    href={event.href}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Смотреть публикацию
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
};
