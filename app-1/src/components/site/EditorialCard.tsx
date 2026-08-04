import { useState } from "react";

import { ArrowUpRight, CalendarDays, ChevronDown } from "lucide-react";

import { Modal } from "@/components/ui/Modal";
import type { EditorialItem } from "@/lib/site/editorial";
import { resolveMediaUrl } from "@/lib/site/media-url";

type EditorialCardProps = {
  readonly item: EditorialItem;
  readonly variant?: "blog" | "default" | "news";
};

export const EditorialCard = ({
  item,
  variant = "default",
}: EditorialCardProps) => {
  const [articleOpen, setArticleOpen] = useState(false);
  const isBlog = variant === "blog";
  const isNews = variant === "news";
  const visibleTags = isNews ? item.tags.slice(0, 1) : item.tags;

  return (
    <>
      <article
        className={`flex h-full flex-col overflow-hidden rounded-4xl ${
          isNews || isBlog ? "border border-line bg-page" : "bg-panel"
        }`}
      >
        <div className="relative">
          <img
            alt={item.title}
            className={`${isBlog ? "h-80" : "h-64"} w-full object-cover`}
            src={resolveMediaUrl(item.image)}
          />
        </div>
        <div className={`flex flex-1 flex-col ${isBlog ? "p-8" : "p-7"}`}>
          {isNews ? (
            <div className="flex flex-wrap items-center gap-3">
              {visibleTags.map((tag) => (
                <span
                  className="rounded-full bg-supporting/30 px-3 py-1.5 text-xs font-semibold text-brand"
                  key={tag}
                >
                  {tag}
                </span>
              ))}
              <span className="text-sm text-muted-ui-foreground">
                {item.date}
              </span>
            </div>
          ) : isBlog ? (
            <div className="flex flex-wrap gap-2">
              {visibleTags.map((tag) => (
                <span
                  className="rounded-full bg-panel px-3 py-1.5 text-xs font-semibold text-brand"
                  key={tag}
                >
                  #{tag}
                </span>
              ))}
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {visibleTags.map((tag) => (
                  <span
                    className="rounded-full bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand"
                    key={tag}
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <p className="mt-5 flex items-center gap-2 text-sm text-muted-ui-foreground">
                <CalendarDays className="size-4" /> {item.date}
              </p>
            </>
          )}
          <h3 className="mt-4 font-heading text-3xl font-semibold text-brand">
            {item.title}
          </h3>
          <p className="mt-4 leading-7 text-muted-ui-foreground">
            {item.description}
          </p>
          {isBlog ? (
            <div className="mt-auto pt-8">
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-ui-foreground">{item.date}</span>
                <button
                  className="flex items-center gap-2 font-semibold text-brand"
                  onClick={() => setArticleOpen(true)}
                  type="button"
                >
                  Читать статью
                  <ArrowUpRight className="size-4" />
                </button>
              </div>
            </div>
          ) : isNews ? (
            <div className="mt-auto pt-6">
              <button
                className="inline-flex items-center gap-2 font-semibold text-brand"
                onClick={() => setArticleOpen(true)}
                type="button"
              >
                Подробнее
                <ArrowUpRight className="size-4" />
              </button>
            </div>
          ) : (
            <details className="group mt-auto pt-6">
              <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-brand">
                {item.buttonText || "Подробнее"}{" "}
                <ChevronDown className="size-4 transition group-open:rotate-180" />
              </summary>
              <p className="mt-4 border-t border-line pt-4 leading-7">
                {item.details}
              </p>
              {item.buttonLink && (
                <a
                  className="mt-4 inline-flex rounded-full border border-brand px-5 py-2.5 font-semibold text-brand"
                  href={item.buttonLink}
                >
                  Перейти
                </a>
              )}
            </details>
          )}
        </div>
      </article>
      {(isNews || isBlog) && (
        <Modal
          className="bg-page text-page-foreground"
          hideHeader
          onClose={() => setArticleOpen(false)}
          open={articleOpen}
          title={item.title}
        >
          <img
            alt={item.title}
            className="relative -mx-6 block aspect-video w-[calc(100%+3rem)] max-w-none shrink-0 object-cover"
            src={resolveMediaUrl(item.image)}
          />
          <div className="px-1 py-5">
            <h2 className="font-heading text-3xl font-semibold text-brand">
              {item.title}
            </h2>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {visibleTags.map((tag) => (
                <span
                  className="rounded-full bg-supporting/30 px-3 py-1.5 text-xs font-semibold text-brand"
                  key={tag}
                >
                  {isBlog ? `#${tag}` : tag}
                </span>
              ))}
              <span className="text-sm text-muted-ui-foreground">
                {item.date}
              </span>
            </div>
            <p className="mt-5 leading-8 text-page-foreground">
              {item.details}
            </p>
          </div>
        </Modal>
      )}
    </>
  );
};
