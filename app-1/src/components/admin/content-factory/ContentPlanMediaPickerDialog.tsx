import { useState } from "react";

import { Check, Search } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { FactoryMediaItem } from "@/lib/content-factory/contentFactoryData";
import { resolveMediaUrl } from "@/lib/site/media-url";

export const ContentPlanMediaPickerDialog = ({
  mediaItems,
  initialSelectedId,
  onApply,
  onClose,
}: {
  mediaItems: FactoryMediaItem[];
  initialSelectedId: string;
  onApply: (imageId: string) => void;
  onClose: () => void;
}) => {
  const [selectedId, setSelectedId] = useState(() =>
    mediaItems.some((item) => item.id === initialSelectedId)
      ? initialSelectedId
      : "",
  );
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase("ru-RU");
  const filteredItems = mediaItems.filter((item) =>
    `${item.title} ${item.category} ${item.tags.join(" ")}`
      .toLocaleLowerCase("ru-RU")
      .includes(normalizedQuery),
  );

  return (
    <Modal
      backdropClassName="z-[80]"
      className="max-w-5xl"
      closeLabel="Закрыть выбор фотографии"
      footer={
        <>
          <Button onClick={onClose} type="button" variant="secondary">
            Отмена
          </Button>
          <Button
            disabled={!selectedId}
            onClick={() => {
              onApply(selectedId);
              onClose();
            }}
            type="button"
          >
            Применить
          </Button>
        </>
      }
      onClose={onClose}
      open
      title="Выберите фото из медиатеки"
    >
      <p className="mb-4 text-sm text-muted-ui-foreground">
        Выберите фотографию по превью. Она будет прикреплена к посту после
        нажатия «Применить».
      </p>

      <label className="relative mb-4 block">
        <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-ui-foreground/80" />
        <input
          autoFocus
          className="min-h-11 w-full rounded-xl border border-line bg-page/70 pr-4 pl-10 text-sm outline-none placeholder:text-muted-ui-foreground/80 focus:border-focus/40 focus:ring-4 focus:ring-focus/10"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Найти фото по названию или тегу…"
          type="search"
          value={query}
        />
      </label>

      {filteredItems.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => {
            const selected = selectedId === item.id;
            return (
              <button
                aria-pressed={selected}
                className={`overflow-hidden rounded-2xl border text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                  selected
                    ? "border-brand ring-2 ring-brand/20"
                    : "border-line hover:border-brand/50"
                }`}
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                type="button"
              >
                <span className="relative block aspect-[4/3] bg-muted-ui/50">
                  <img
                    alt={item.title}
                    className="size-full object-cover"
                    loading="lazy"
                    src={resolveMediaUrl(item.image)}
                  />
                  <span className="absolute top-2 right-2 grid size-8 place-items-center rounded-full bg-brand-foreground/95 text-muted-ui-foreground shadow">
                    {selected ? <Check className="size-4 text-brand" /> : null}
                  </span>
                </span>
                <span className="block truncate px-3 py-2.5 text-sm font-semibold text-page-foreground">
                  {item.title}
                </span>
                <span className="block truncate px-3 pb-3 text-xs text-muted-ui-foreground">
                  {item.category}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="py-12 text-center text-sm text-muted-ui-foreground">
          {mediaItems.length
            ? "Подходящие фотографии не найдены. Попробуйте изменить запрос."
            : "В медиатеке пока нет фотографий."}
        </p>
      )}
    </Modal>
  );
};
