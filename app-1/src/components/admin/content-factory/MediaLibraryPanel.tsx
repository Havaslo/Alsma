import { useMemo, useRef, useState } from "react";

import { Check, ImagePlus, Search, Upload } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { contentFactoryErrorMessage } from "@/lib/content-factory/contentFactoryApi";
import type { FactoryMediaItem } from "@/lib/content-factory/contentFactoryData";
import { resolveMediaUrl } from "@/lib/site/media-url";

export const MediaLibraryPanel = ({
  isLoadingMedia,
  isUploadingMedia,
  mediaError,
  mediaItems,
  onRefreshMedia,
  onUploadMedia,
  selectedMediaId,
  selectedSourceMediaIds,
  selectingSourceMedia,
  onUseMedia,
  onToggleSourceMedia,
  onAddSourceMedia,
}: {
  isLoadingMedia: boolean;
  isUploadingMedia: boolean;
  mediaError: string;
  mediaItems: FactoryMediaItem[];
  onRefreshMedia: () => void;
  onUploadMedia: (file: File) => Promise<unknown>;
  selectedMediaId: string;
  selectedSourceMediaIds: string[];
  selectingSourceMedia: boolean;
  onUseMedia: (mediaId: string) => void;
  onToggleSourceMedia: (mediaId: string) => void;
  onAddSourceMedia: () => void;
}) => {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Все материалы");
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const categories = useMemo(
    () => [
      "Все материалы",
      ...new Set(mediaItems.map((item) => item.category)),
    ],
    [mediaItems],
  );
  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ru-RU");
    return mediaItems.filter((item) => {
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
  }, [category, mediaItems, query]);

  const uploadFiles = async (files?: FileList) => {
    if (!files?.length) return;
    const selectedFiles = Array.from(files);
    setUploadError("");
    try {
      for (const file of selectedFiles) {
        if (file.size > 50 * 1_024 * 1_024) {
          setUploadError(
            `«${file.name}» пропущен: размер изображения не должен превышать 50 МБ.`,
          );
          continue;
        }
        try {
          await onUploadMedia(file);
        } catch (error) {
          setUploadError(
            contentFactoryErrorMessage(
              error,
              `Не удалось загрузить «${file.name}». Попробуйте ещё раз.`,
            ),
          );
        }
      }
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 rounded-3xl border border-line bg-brand-foreground p-5 shadow-[0_8px_30px_rgba(25,45,34,0.045)] sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.13em] text-brand uppercase">
            <ImagePlus className="size-4" /> Медиатека
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-page-foreground">
            Визуалы ALSMA
          </h2>
          <p className="mt-1 text-sm text-muted-ui-foreground">
            Подборка фотографий по услугам, пространствам и событиям.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            multiple
            onChange={(event) =>
              void uploadFiles(event.target.files ?? undefined)
            }
            ref={fileInputRef}
            tabIndex={-1}
            type="file"
          />
          <Button
            className="min-h-11 shrink-0 rounded-xl bg-brand text-white hover:bg-brand/90"
            disabled={isUploadingMedia}
            onClick={() => fileInputRef.current?.click()}
            type="button"
          >
            <Upload className="size-4" />
            {isUploadingMedia ? "Загружаем…" : "Загрузить фото"}
          </Button>
          {selectingSourceMedia && (
            <Button
              className="min-h-11 shrink-0 rounded-xl bg-slate-900 text-white hover:bg-slate-800"
              disabled={!selectedSourceMediaIds.length}
              onClick={onAddSourceMedia}
              type="button"
            >
              Добавить выбранные ({selectedSourceMediaIds.length})
            </Button>
          )}
        </div>
      </section>

      <div aria-live="polite" className="space-y-2">
        <p className="text-xs text-muted-ui-foreground">
          Можно загрузить несколько фото за раз. Поддерживаются JPG, PNG, WebP и
          GIF — до 50 МБ на изображение.
          {selectingSourceMedia &&
            " Выберите изображения и подтвердите добавление."}
        </p>
        {(uploadError || mediaError) && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800">
            <span>{uploadError || mediaError}</span>
            {mediaError && (
              <button
                className="font-semibold underline underline-offset-2"
                onClick={onRefreshMedia}
                type="button"
              >
                Загрузить список ещё раз
              </button>
            )}
          </div>
        )}
      </div>

      <section className="rounded-3xl border border-line bg-brand-foreground p-4 shadow-[0_8px_30px_rgba(25,45,34,0.045)] sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative block min-w-0 flex-1 lg:max-w-md">
            <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-ui-foreground/80" />
            <input
              className="min-h-11 w-full rounded-xl border border-line bg-page/70 pr-4 pl-10 text-sm transition outline-none placeholder:text-muted-ui-foreground/80 focus:border-focus/40 focus:bg-brand-foreground focus:ring-4 focus:ring-focus/10"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Найти фото по теме или тегу…"
              type="search"
              value={query}
            />
          </label>
          <span className="text-xs text-muted-ui-foreground">
            {isLoadingMedia
              ? "Загружаем библиотеку…"
              : `Найдено: ${filteredItems.length} материалов`}
          </span>
        </div>
        <div className="mt-4 scrollbar-none flex gap-2 overflow-x-auto pb-1">
          {categories.map((item) => (
            <button
              aria-pressed={category === item}
              className={cn(
                "min-h-9 shrink-0 rounded-full border px-3.5 text-xs font-semibold transition",
                category === item
                  ? "border-brand bg-brand text-white"
                  : "border-line bg-brand-foreground text-muted-ui-foreground hover:bg-page",
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
            const selected = selectingSourceMedia
              ? selectedSourceMediaIds.includes(item.id)
              : selectedMediaId === item.id;
            const handleSelect = () =>
              selectingSourceMedia
                ? onToggleSourceMedia(item.id)
                : onUseMedia(item.id);
            return (
              <article
                className={cn(
                  "overflow-hidden rounded-3xl border bg-brand-foreground shadow-[0_8px_30px_rgba(25,45,34,0.04)] transition",
                  selected
                    ? "border-brand ring-2 ring-brand/15"
                    : "border-line hover:-translate-y-0.5 hover:shadow-lg",
                )}
                key={item.id}
              >
                <button
                  aria-label={`Выбрать изображение: ${item.title}`}
                  aria-pressed={selected}
                  className="relative block aspect-[4/3] w-full overflow-hidden bg-muted-ui/50"
                  onClick={handleSelect}
                  type="button"
                >
                  <img
                    alt={item.title}
                    className="size-full object-cover transition duration-500 hover:scale-[1.03]"
                    src={resolveMediaUrl(item.image)}
                  />
                  <span className="absolute top-3 left-3 rounded-full bg-brand-foreground/90 px-2.5 py-1 text-[11px] font-semibold text-page-foreground shadow-sm backdrop-blur">
                    {item.category}
                  </span>
                  {selected && (
                    <span className="absolute top-3 right-3 grid size-7 place-items-center rounded-full bg-brand text-white shadow-md">
                      <Check className="size-4" />
                    </span>
                  )}
                </button>
                <div className="p-4">
                  <h3 className="truncate text-sm font-semibold text-page-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-xs text-muted-ui-foreground">
                    {item.subtitle} · {item.category}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {item.tags.map((tag) => (
                      <button
                        className="rounded-full bg-muted-ui/50 px-2.5 py-1 text-[10px] font-medium text-muted-ui-foreground transition hover:bg-brand/5 hover:text-brand"
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
                        ? "bg-brand text-white hover:bg-brand/90"
                        : "bg-brand-foreground text-page-foreground ring-1 ring-slate-200 hover:bg-page",
                    )}
                    onClick={handleSelect}
                    type="button"
                  >
                    {selectingSourceMedia
                      ? selected
                        ? "Убрать из выбора"
                        : "Добавить к исходным фото"
                      : selected
                        ? "Выбрано · использовать"
                        : "Создать публикацию с фото"}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-brand-foreground px-6 py-14 text-center">
          <Search className="mx-auto size-6 text-muted-ui-foreground/80" />
          <p className="mt-3 text-sm font-semibold text-page-foreground">
            Ничего не найдено
          </p>
          <p className="mt-1 text-xs text-muted-ui-foreground">
            Попробуйте изменить запрос или выбрать другую категорию.
          </p>
        </div>
      )}
    </div>
  );
};
