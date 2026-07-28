import { CalendarDays, ChevronDown } from "lucide-react";

import type { EditorialItem } from "@/lib/site/editorial";

type EditorialCardProps = {
  readonly item: EditorialItem;
  readonly variant?: "blog" | "default" | "news";
};

const getRemainingPlaces = (item: EditorialItem) =>
  item.remainingPlaces ??
  item.tags.find((tag) => tag.toLocaleLowerCase().includes("осталось"));

export const EditorialCard = ({
  item,
  variant = "default",
}: EditorialCardProps) => {
  const isBlog = variant === "blog";
  const isNews = variant === "news";
  const remainingPlaces = isNews ? getRemainingPlaces(item) : undefined;
  const visibleTags =
    isNews && remainingPlaces
      ? item.tags.filter((tag) => tag !== remainingPlaces)
      : item.tags;

  return (
    <article
      className={`flex h-full flex-col overflow-hidden rounded-4xl ${
        isNews || isBlog ? "border border-line bg-page" : "bg-panel"
      }`}
    >
      <div className="relative">
        <img
          alt={item.title}
          className={`${isBlog ? "h-80" : "h-64"} w-full object-cover`}
          src={item.image}
        />
        {remainingPlaces && (
          <span className="absolute top-4 left-4 rounded-full bg-page px-4 py-2 text-xs font-semibold tracking-wide text-brand uppercase">
            {remainingPlaces}
          </span>
        )}
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
          <details className="group mt-auto pt-8">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
              <span className="text-muted-ui-foreground">{item.date}</span>
              <span className="flex items-center gap-2 font-semibold text-brand">
                Читать статью
                <ChevronDown className="size-4 -rotate-90 transition group-open:rotate-180" />
              </span>
            </summary>
            <div className="mt-5 border-t border-line pt-5 leading-7">
              {item.details}
            </div>
            {item.buttonLink && (
              <a
                className="mt-5 inline-flex rounded-full border border-brand px-5 py-2.5 font-semibold text-brand"
                href={item.buttonLink}
              >
                Перейти
              </a>
            )}
          </details>
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
  );
};
