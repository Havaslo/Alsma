import { useState } from "react";

import heroImage from "@/assets/alsma/spa-forest-walk.jpg";
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
  ["archive", "Архив"],
] as const;

export const NewsPage = () => {
  const [filter, setFilter] = useState("all");
  const page = PUBLIC_PAGES.news;
  const content = usePublishedSiteContent("news");
  const hero = content.data?.items?.find(
    (item) => item.itemKey === "hero",
  )?.content;
  const allNewsItems = [
    ...getSiteCollection<EditorialItem>(
      content.data?.items,
      "items",
      NEWS_ITEMS,
    ),
  ]
    .filter((item) => item.isActive !== false)
    .sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0));
  const activeNewsItems = allNewsItems.filter(
    (item) => item.isArchived !== true,
  );
  const items =
    filter === "archive"
      ? allNewsItems.filter((item) => item.isArchived === true)
      : filter === "all"
        ? activeNewsItems
        : activeNewsItems.filter((item) => item.category === filter);

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
      <section
        className="mx-auto max-w-[100rem] px-5 py-24 sm:px-8"
        id="details"
      >
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-semibold tracking-widest text-brand uppercase">
            Лента обновлений
          </p>
          <h2 className="mt-4 font-heading text-4xl font-semibold sm:text-5xl">
            Новости отеля
          </h2>
          <p className="mt-5 text-lg leading-8 text-muted-ui-foreground">
            Следите за ближайшими программами, тематическими заездами и
            специальными форматами отдыха.
          </p>
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
            <EditorialCard item={item} key={item.title} variant="news" />
          ))}
        </div>
        {items.length === 0 && (
          <div className="mt-12 rounded-4xl border border-line bg-page px-6 py-16 text-center text-muted-ui-foreground">
            В этом разделе пока нет публикаций.
          </div>
        )}
      </section>
    </main>
  );
};
