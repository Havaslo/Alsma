import { useState } from "react";

import { Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { FactoryMediaItem } from "@/lib/content-factory/contentFactoryData";
import { resolveMediaUrl } from "@/lib/site/media-url";

const MAX_CHANNEL_IMAGES = 4;

export const ChannelImageSelectionDialog = ({
  channelLabel,
  initialSelectedIds,
  mediaItems,
  onApply,
  onClose,
}: {
  channelLabel: string;
  initialSelectedIds: string[];
  mediaItems: FactoryMediaItem[];
  onApply: (imageIds: string[]) => Promise<boolean>;
  onClose: () => void;
}) => {
  const availableIds = new Set(mediaItems.map((item) => item.id));
  const [selectedIds, setSelectedIds] = useState(() =>
    [...new Set(initialSelectedIds)]
      .filter((id) => availableIds.has(id))
      .slice(0, MAX_CHANNEL_IMAGES),
  );
  const [query, setQuery] = useState("");
  const [isApplying, setIsApplying] = useState(false);
  const [saveError, setSaveError] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase("ru-RU");
  const filteredItems = mediaItems.filter((item) =>
    `${item.title} ${item.category} ${item.tags.join(" ")}`
      .toLocaleLowerCase("ru-RU")
      .includes(normalizedQuery),
  );

  const toggleImage = (imageId: string) => {
    setSaveError("");
    setSelectedIds((current) => {
      if (current.includes(imageId)) {
        return current.filter((id) => id !== imageId);
      }
      return current.length < MAX_CHANNEL_IMAGES
        ? [...current, imageId]
        : current;
    });
  };

  const applySelection = async () => {
    setSaveError("");
    setIsApplying(true);
    let applied = false;
    try {
      applied = await onApply(selectedIds);
    } catch {
      applied = false;
    } finally {
      setIsApplying(false);
    }
    if (applied) {
      onClose();
    } else {
      setSaveError("Не удалось сохранить выбор. Попробуйте применить ещё раз.");
    }
  };

  return (
    <Modal
      className="max-w-5xl"
      closeLabel="Закрыть выбор изображений"
      footer={
        <>
          <Button
            disabled={isApplying}
            onClick={onClose}
            type="button"
            variant="secondary"
          >
            Отмена
          </Button>
          <Button
            disabled={!selectedIds.length || isApplying}
            onClick={() => void applySelection()}
            type="button"
          >
            {isApplying
              ? "Применяем…"
              : `Применить выбранные (${selectedIds.length})`}
          </Button>
        </>
      }
      onClose={isApplying ? () => undefined : onClose}
      open
      title={`Изображения для публикации · ${channelLabel}`}
    >
      <p className="mb-4 text-sm leading-6 text-muted-ui-foreground">
        Отмечайте фотографии в нужной очередности — номер на карточке станет её
        местом в публикации. Пока вы не нажмёте «Применить», текущие изображения
        не изменятся. Можно выбрать до {MAX_CHANNEL_IMAGES} изображений.
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

      {selectedIds.length > 0 && (
        <div className="mb-4 rounded-xl border border-brand/15 bg-brand/[0.035] px-3.5 py-3">
          <p className="text-xs font-semibold text-page-foreground">
            Порядок в публикации
          </p>
          <ol className="mt-2 flex flex-wrap gap-2">
            {selectedIds.map((id, index) => {
              const image = mediaItems.find((item) => item.id === id);
              return (
                <li
                  className="flex max-w-full items-center gap-1.5 rounded-full bg-brand-foreground px-2.5 py-1 text-xs text-page-foreground"
                  key={id}
                >
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-brand text-[10px] font-bold text-white">
                    {index + 1}
                  </span>
                  <span className="max-w-48 truncate">
                    {image?.title ?? "Изображение"}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {saveError && (
        <p
          aria-live="polite"
          className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800"
          role="alert"
        >
          {saveError}
        </p>
      )}

      {filteredItems.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => {
            const selectionOrder = selectedIds.indexOf(item.id);
            const selected = selectionOrder >= 0;
            const limitReached =
              !selected && selectedIds.length >= MAX_CHANNEL_IMAGES;
            return (
              <button
                aria-label={
                  selected
                    ? `Убрать из публикации: ${item.title}, номер ${selectionOrder + 1}`
                    : `Добавить в публикацию: ${item.title}`
                }
                aria-pressed={selected}
                className={`overflow-hidden rounded-2xl border text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                  selected
                    ? "border-brand ring-2 ring-brand/20"
                    : "border-line hover:border-brand/50"
                } ${limitReached ? "cursor-not-allowed opacity-50" : ""}`}
                disabled={limitReached || isApplying}
                key={item.id}
                onClick={() => toggleImage(item.id)}
                type="button"
              >
                <span className="relative block aspect-[4/3] bg-muted-ui/50">
                  <img
                    alt={item.title}
                    className="size-full object-cover"
                    loading="lazy"
                    src={resolveMediaUrl(item.image)}
                  />
                  <span
                    className={`absolute top-2 right-2 grid size-8 place-items-center rounded-full text-xs font-bold shadow ${
                      selected
                        ? "bg-brand text-white"
                        : "bg-brand-foreground/95 text-muted-ui-foreground"
                    }`}
                  >
                    {selected ? (
                      selectionOrder + 1
                    ) : (
                      <Plus className="size-4" />
                    )}
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
            ? "Подходящие изображения не найдены. Попробуйте изменить запрос."
            : "В медиатеке пока нет изображений для выбора."}
        </p>
      )}

      <p aria-live="polite" className="mt-4 text-xs text-muted-ui-foreground">
        Выбрано: {selectedIds.length} из {MAX_CHANNEL_IMAGES}
        {selectedIds.length === MAX_CHANNEL_IMAGES &&
          " · чтобы добавить другое, снимите отметку с одного из выбранных фото"}
      </p>
    </Modal>
  );
};
