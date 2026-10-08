import { useState } from "react";

import { Check, Search, X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import type { FactoryMediaItem } from "@/lib/content-factory/contentFactoryData";
import { resolveMediaUrl } from "@/lib/site/media-url";

export const ContentImageGalleryDialog = ({
  mediaItems,
  initialSelectedIds,
  onClose,
  onConfirm,
}: {
  mediaItems: FactoryMediaItem[];
  initialSelectedIds: string[];
  onClose: () => void;
  onConfirm: (ids: string[]) => void;
}) => {
  const [selectedIds, setSelectedIds] = useState(() =>
    initialSelectedIds.slice(0, 4),
  );
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase("ru-RU");
  const filteredItems = mediaItems.filter((item) =>
    `${item.title} ${item.category} ${item.tags.join(" ")}`
      .toLocaleLowerCase("ru-RU")
      .includes(normalizedQuery),
  );

  const toggle = (id: string) => {
    setSelectedIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      return current.length < 4 ? [...current, id] : current;
    });
  };

  return (
    <div
      aria-label="Выбор изображений из галереи"
      aria-modal="true"
      className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-slate-950/50 p-3 backdrop-blur-[2px] sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="dialog"
    >
      <section className="my-auto flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-line bg-brand-foreground shadow-2xl">
        <header className="flex items-center justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-semibold text-page-foreground">
              Выберите фото для редактирования
            </h2>
            <p className="mt-1 text-sm text-muted-ui-foreground">
              Можно выбрать до четырёх изображений. Выбрано:{" "}
              {selectedIds.length}
            </p>
          </div>
          <button
            aria-label="Закрыть галерею"
            className="grid size-9 shrink-0 place-items-center rounded-xl text-muted-ui-foreground hover:bg-page"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="border-b border-line p-4 sm:px-6">
          <label className="relative block">
            <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-ui-foreground/80" />
            <input
              autoFocus
              className="min-h-11 w-full rounded-xl border border-line bg-page/70 pr-4 pl-10 text-sm outline-none placeholder:text-muted-ui-foreground/80 focus:border-focus/40 focus:ring-4 focus:ring-focus/10"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Найти фото по теме или тегу…"
              type="search"
              value={query}
            />
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          {filteredItems.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredItems.map((item) => {
                const selected = selectedIds.includes(item.id);
                const disabled = !selected && selectedIds.length >= 4;
                return (
                  <button
                    aria-pressed={selected}
                    className={`overflow-hidden rounded-2xl border text-left transition ${
                      selected
                        ? "border-brand ring-2 ring-brand/20"
                        : "border-line hover:border-brand/50"
                    } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
                    disabled={disabled}
                    key={item.id}
                    onClick={() => toggle(item.id)}
                    type="button"
                  >
                    <span className="relative block aspect-[4/3] bg-muted-ui/50">
                      <img
                        alt={item.title}
                        className="size-full object-cover"
                        src={resolveMediaUrl(item.image)}
                      />
                      <span className="absolute top-2 right-2 grid size-8 place-items-center rounded-full bg-brand-foreground/95 text-xs font-bold text-page-foreground shadow">
                        {selected ? (
                          <Check className="size-4 text-brand" />
                        ) : (
                          item.category.slice(0, 1)
                        )}
                      </span>
                    </span>
                    <span className="block truncate px-3 py-2.5 text-sm font-semibold text-page-foreground">
                      {item.title}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="py-12 text-center text-sm text-muted-ui-foreground">
              Изображения не найдены.
            </p>
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4 sm:px-6">
          <button
            className="text-sm font-medium text-muted-ui-foreground hover:text-page-foreground"
            onClick={onClose}
            type="button"
          >
            Отмена
          </button>
          <Button
            disabled={!selectedIds.length}
            onClick={() => {
              onConfirm(selectedIds);
              onClose();
            }}
            type="button"
          >
            Добавить выбранные ({selectedIds.length})
          </Button>
        </footer>
      </section>
    </div>
  );
};
