import { useState } from "react";

import { ExternalLink } from "lucide-react";

import heroImage from "@/assets/alsma/spa-forest-walk.jpg";
import { EditorialCard } from "@/components/site/EditorialCard";
import { PublicHero } from "@/components/site/PublicHero";
import { SiteHeader } from "@/components/site/SiteHeader";
import { BLOG_ITEMS } from "@/lib/site/editorial";
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
  const items =
    filter === "all"
      ? BLOG_ITEMS
      : BLOG_ITEMS.filter((item) => item.category === filter);

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
      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8" id="details">
        <div className="text-center">
          <p className="text-sm font-semibold tracking-widest text-brand uppercase">
            Журнал впечатлений
          </p>
          <h2 className="mt-4 font-heading text-4xl font-semibold sm:text-5xl">
            Статьи о красивом и спокойном отдыхе
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
      <section className="bg-panel py-20">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 sm:px-8 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-semibold tracking-widest text-brand uppercase">
              Следите за нами в соцсетях
            </p>
            <h2 className="mt-4 font-heading text-4xl font-semibold sm:text-5xl">
              Больше историй, идей и вдохновения
            </h2>
            <p className="mt-5 leading-7 text-muted-ui-foreground">
              Показываем атмосферу отдыха, делимся анонсами и рассказываем о
              красивых местах рядом с АЛСМА.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <a
              className="flex items-center justify-between rounded-3xl bg-page p-6 font-semibold text-brand"
              href="https://vk.com/alsma_nnov"
              rel="noreferrer"
              target="_blank"
            >
              ВКонтакте <ExternalLink className="size-5" />
            </a>
            <a
              className="flex items-center justify-between rounded-3xl bg-page p-6 font-semibold text-brand"
              href="https://web.max.ru/158586418"
              rel="noreferrer"
              target="_blank"
            >
              MAX <ExternalLink className="size-5" />
            </a>
          </div>
        </div>
      </section>
    </main>
  );
};
