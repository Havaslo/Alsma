import { useMemo, useState } from "react";

import { Check, ImagePlus, Search, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { MEDIA_ITEMS } from "@/lib/content-factory/contentFactoryData";

export const MediaLibraryPanel = ({
  selectedMediaId,
  onUseMedia,
  onGenerateImage,
}: {
  selectedMediaId: string;
  onUseMedia: (mediaId: string) => void;
  onGenerateImage: () => void;
}) => {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Все материалы");
  const categories = useMemo(
    () => [
      "Все материалы",
      ...new Set(MEDIA_ITEMS.map((item) => item.category)),
    ],
    [],
  );
  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ru-RU");
    return MEDIA_ITEMS.filter((item) => {
      const matchesCategory =
        category === "Все материалы" || item.category === category;
      const searchable =
        `${item.title} ${item.category} ${item.tags.join(" ")}`.toLocaleLowerCase(
          "ru-RU",
        );
      return (
        matchesCategory &&
        (!normalizedQuery || searchable.includes(normalizedQuery))
      );
    });
  }, [category, query]);

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 rounded-3xl border border-slate-200/90 bg-white p-5 shadow-[0_8px_30px_rgba(25,45,34,0.045)] sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.13em] text-emerald-800 uppercase">
            <ImagePlus className="size-4" /> Медиатека
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            Визуалы ALSMA
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Подборка фотографий по услугам, пространствам и событиям.
          </p>
        </div>
        <Button
          className="min-h-11 shrink-0 rounded-xl bg-slate-900 text-white hover:bg-slate-800"
          onClick={onGenerateImage}
          type="button"
        >
          <Sparkles className="size-4" /> Сгенерировать изображение
        </Button>
      </section>

      <section className="rounded-3xl border border-slate-200/90 bg-white p-4 shadow-[0_8px_30px_rgba(25,45,34,0.045)] sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative block min-w-0 flex-1 lg:max-w-md">
            <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" />
            <input
              className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 pr-4 pl-10 text-sm transition outline-none placeholder:text-slate-400 focus:border-emerald-700/40 focus:bg-white focus:ring-4 focus:ring-emerald-700/10"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Найти фото по теме или тегу…"
              type="search"
              value={query}
            />
          </label>
          <span className="text-xs text-slate-500">
            Найдено: {filteredItems.length} материалов
          </span>
        </div>
        <div className="mt-4 scrollbar-none flex gap-2 overflow-x-auto pb-1">
          {categories.map((item) => (
            <button
              aria-pressed={category === item}
              className={cn(
                "min-h-9 shrink-0 rounded-full border px-3.5 text-xs font-semibold transition",
                category === item
                  ? "border-emerald-800 bg-emerald-800 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
              )}
              key={item}
              onClick={() => setCategory(item)}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      {filteredItems.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filteredItems.map((item) => {
            const selected = selectedMediaId === item.id;
            return (
              <article
                className={cn(
                  "overflow-hidden rounded-3xl border bg-white shadow-[0_8px_30px_rgba(25,45,34,0.04)] transition",
                  selected
                    ? "border-emerald-700 ring-2 ring-emerald-700/15"
                    : "border-slate-200 hover:-translate-y-0.5 hover:shadow-lg",
                )}
                key={item.id}
              >
                <button
                  aria-label={`Выбрать изображение: ${item.title}`}
                  aria-pressed={selected}
                  className="relative block aspect-[4/3] w-full overflow-hidden bg-slate-100"
                  onClick={() => onUseMedia(item.id)}
                  type="button"
                >
                  <img
                    alt={item.title}
                    className="size-full object-cover transition duration-500 hover:scale-[1.03]"
                    src={item.image}
                  />
                  <span className="absolute top-3 left-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-sm backdrop-blur">
                    {item.category}
                  </span>
                  {selected && (
                    <span className="absolute top-3 right-3 grid size-7 place-items-center rounded-full bg-emerald-800 text-white shadow-md">
                      <Check className="size-4" />
                    </span>
                  )}
                </button>
                <div className="p-4">
                  <h3 className="truncate text-sm font-semibold text-slate-900">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.dimensions} · {item.category}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {item.tags.map((tag) => (
                      <button
                        className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-medium text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-800"
                        key={tag}
                        onClick={() => setQuery(tag)}
                        type="button"
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                  <Button
                    className={cn(
                      "mt-4 min-h-10 w-full rounded-xl text-xs",
                      selected
                        ? "bg-emerald-800 text-white hover:bg-emerald-900"
                        : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50",
                    )}
                    onClick={() => onUseMedia(item.id)}
                    type="button"
                  >
                    {selected
                      ? "Выбрано · использовать"
                      : "Создать публикацию с фото"}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <Search className="mx-auto size-6 text-slate-400" />
          <p className="mt-3 text-sm font-semibold text-slate-700">
            Ничего не найдено
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Попробуйте изменить запрос или выбрать другую категорию.
          </p>
        </div>
      )}
    </div>
  );
};
