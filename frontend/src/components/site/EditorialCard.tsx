import { CalendarDays, ChevronDown } from "lucide-react";

import type { EditorialItem } from "@/lib/site/editorial";

export const EditorialCard = ({ item }: { readonly item: EditorialItem }) => (
  <article className="flex h-full flex-col overflow-hidden rounded-4xl bg-panel">
    <img
      alt={item.title}
      className="h-64 w-full object-cover"
      src={item.image}
    />
    <div className="flex flex-1 flex-col p-7">
      <div className="flex flex-wrap gap-2">
        {item.tags.map((tag) => (
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
      <h3 className="mt-4 font-heading text-3xl font-semibold text-brand">
        {item.title}
      </h3>
      <p className="mt-4 leading-7 text-muted-ui-foreground">
        {item.description}
      </p>
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
    </div>
  </article>
);
