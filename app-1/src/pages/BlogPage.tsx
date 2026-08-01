import { useState } from "react";

import heroImage from "@/assets/alsma/spa-forest-walk.jpg";
import { EditorialCard } from "@/components/site/EditorialCard";
import { PublicHero } from "@/components/site/PublicHero";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SocialLinksSection } from "@/components/site/SocialLinksSection";
import { getSiteCollection } from "@/lib/site/content-collections";
import { BLOG_ITEMS, type EditorialItem } from "@/lib/site/editorial";
import { PUBLIC_PAGES } from "@/lib/site/public-pages";
import { usePublishedSiteContent } from "@/lib/site/useSiteContent";

const filters = [
  ["all", "Все статьи"],
  ["stories", "Истории гостей"],
  ["guide", "Гид по региону"],
  ["tips", "Полезные советы"],
] as const;

export const BlogPage = () => {
  const [filter, setFilter] = useState("all");
  const page = PUBLIC_PAGES.blog;
  const content = usePublishedSiteContent("blog");
  const hero = content.data?.items.find(
    (item) => item.itemKey === "hero",
  )?.content;
  const allBlogItems = getSiteCollection<EditorialItem>(
    content.data?.items,
    "items",
    BLOG_ITEMS,
  )
    .filter((item) => item.isActive !== false)
    .sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0));
  const items =
    filter === "all"
      ? allBlogItems
      : allBlogItems.filter((item) => item.category === filter);

  return (
    <main className="min-h-screen bg-page text-page-foreground">
      <SiteHeader />
      <PublicHero
        description={
          typeof hero?.description === "string"
            ? hero.description
            : page.description
        }
        eyebrow="Вдохновение для поездки в АЛСМА"
        image={typeof hero?.image === "string" ? hero.image : heroImage}
        title={typeof hero?.title === "string" ? hero.title : "Блог"}
      />
      <section
        className="mx-auto max-w-[100rem] px-5 py-24 sm:px-8"
        id="details"
      >
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-semibold tracking-widest text-brand uppercase">
            Журнал впечатлений
          </p>
          <h2 className="mt-4 font-heading text-4xl font-semibold sm:text-5xl">
            Статьи о красивом и спокойном отдыхе
          </h2>
          <p className="mt-5 text-lg leading-8 text-muted-ui-foreground">
            Выбирайте тему, читайте истории и сохраняйте идеи для следующей
            поездки в АЛСМА.
          </p>
        </div>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {filters.map(([value, label]) => (
            <button
              className={`rounded-full border px-5 py-3 font-semibold ${filter === value ? "border-brand bg-brand text-brand-foreground" : "border-line bg-page"}`}
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
            <EditorialCard item={item} key={item.title} variant="blog" />
          ))}
        </div>
        {items.length === 0 && (
          <div className="mt-12 rounded-4xl border border-line bg-page px-6 py-16 text-center text-muted-ui-foreground">
            В этом разделе пока нет публикаций.
          </div>
        )}
      </section>
      <SocialLinksSection
        description="Показываем атмосферу отдыха, делимся анонсами, публикуем статьи и рассказываем о красивых местах рядом с АЛСМА."
        title="Больше историй, идей для поездок и вдохновения — в наших соцсетях"
      />
    </main>
  );
};
