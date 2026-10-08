import { ImagePlus, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/Button";
import {
  type ContentChannel,
  type DraftVariant,
  type FactoryMediaItem,
  getDraftVariantImageIds,
} from "@/lib/content-factory/contentFactoryData";
import { resolveMediaUrl } from "@/lib/site/media-url";

export const ContentFactoryResultImages = ({
  variant,
  mediaItems,
  selectedChannels,
  activeChannel,
  requestedCount,
  isGenerating,
  onGenerate,
  allowNewImages,
}: {
  variant: DraftVariant;
  mediaItems: FactoryMediaItem[];
  selectedChannels: ContentChannel[];
  activeChannel: ContentChannel;
  requestedCount: number;
  isGenerating: boolean;
  onGenerate: () => void;
  allowNewImages: boolean;
}) => {
  const channels = selectedChannels.length ? selectedChannels : [activeChannel];
  const imageGroups = channels.map((channel) => ({
    channel,
    images: getDraftVariantImageIds(variant, channel)
      .map((id) => mediaItems.find((item) => item.id === id))
      .filter((image): image is FactoryMediaItem => Boolean(image)),
  }));
  const groupCount = Math.max(
    0,
    ...imageGroups.map(({ images }) => images.length),
  );

  return (
    <section aria-label="Изображения результата" className="min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-page-foreground">
            Изображения
          </h3>
          <p className="mt-1 text-xs leading-5 text-muted-ui-foreground">
            {requestedCount === 0
              ? "Для этой задачи выбран режим «Без фото»."
              : `Запрошено: ${requestedCount}. Показываем кадры для канала ${channels.find((channel) => channel === activeChannel) ? activeChannel.toUpperCase() : (channels[0]?.toUpperCase() ?? "")}.`}
          </p>
        </div>
        {groupCount > 0 && (
          <span className="rounded-full bg-page px-2.5 py-1 text-xs font-semibold text-muted-ui-foreground">
            {groupCount} {groupCount === 1 ? "изображение" : "изображения"}
          </span>
        )}
      </div>

      {groupCount > 0 ? (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-2">
            {Array.from({ length: groupCount }, (_, index) => {
              const preferred = imageGroups.find(
                ({ channel }) => channel === activeChannel,
              );
              const selected =
                preferred?.images[index] ??
                imageGroups.find(({ images }) => images[index])?.images[index];
              if (!selected) return null;
              const availableChannels = imageGroups
                .filter(({ images }) => Boolean(images[index]))
                .map(({ channel }) => channel.toUpperCase());
              return (
                <article
                  className="overflow-hidden rounded-2xl border border-line bg-brand-foreground"
                  key={`${selected.id}-${index}`}
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-page">
                    <img
                      alt={`Вариант изображения ${index + 1}`}
                      className="size-full object-cover"
                      loading="lazy"
                      src={resolveMediaUrl(selected.image)}
                    />
                    <span className="absolute top-2 left-2 rounded-full bg-brand-foreground/95 px-2 py-1 text-[10px] font-semibold text-page-foreground shadow-sm">
                      {selected.origin === "generated"
                        ? "Создано ИИ"
                        : "Медиатека"}
                    </span>
                  </div>
                  <div className="p-3">
                    <p className="truncate text-xs font-semibold text-page-foreground">
                      Изображение {index + 1}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-ui-foreground">
                      {availableChannels.join(" · ") || selected.title}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
          {groupCount < requestedCount && allowNewImages && (
            <Button
              aria-busy={isGenerating}
              className="mt-3 w-full"
              disabled={isGenerating}
              onClick={onGenerate}
              type="button"
            >
              <Sparkles className="size-4" />
              {isGenerating ? "Создаём…" : "Создать недостающие изображения"}
            </Button>
          )}
        </>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-line bg-page/60 px-4 py-8 text-center">
          <ImagePlus className="mx-auto size-6 text-muted-ui-foreground" />
          <p className="mt-2 text-sm font-semibold text-page-foreground">
            {requestedCount === 0
              ? "Только текст"
              : "Изображения пока не готовы"}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-ui-foreground">
            {requestedCount === 0
              ? "Если понадобится, вернитесь к задаче и выберите количество изображений."
              : "Можно создать визуал для выбранной версии текста."}
          </p>
          {requestedCount > 0 && allowNewImages && (
            <Button
              aria-busy={isGenerating}
              className="mt-4"
              disabled={isGenerating}
              onClick={onGenerate}
              type="button"
            >
              <Sparkles className="size-4" />
              {isGenerating ? "Создаём…" : "Создать изображения"}
            </Button>
          )}
        </div>
      )}
      {isGenerating && (
        <p
          aria-live="polite"
          className="mt-3 text-xs text-muted-ui-foreground"
          role="status"
        >
          Создаём изображения и подготавливаем кадрирования для каналов…
        </p>
      )}
    </section>
  );
};
