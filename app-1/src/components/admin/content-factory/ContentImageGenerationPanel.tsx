import { useState } from "react";

import { ChevronDown, ImagePlus, Sparkles, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import {
  type ContentChannel,
  type DraftVariant,
  type FactoryMediaItem,
  getDraftVariantSourceImageIds,
} from "@/lib/content-factory/contentFactoryData";
import type {
  ContentFactoryGuidelines,
  ImageGenerationMode,
} from "@/lib/content-factory/contentFactoryTypes";
import { resolveMediaUrl } from "@/lib/site/media-url";

import { QuietButton } from "./ContentFactoryPrimitives";

export const ContentImageGenerationPanel = ({
  variant,
  mediaItems,
  selectedChannels,
  guidelines,
  isGeneratingImage,
  onOpenSourcePicker,
  onRemoveSource,
  onSetPrimarySource,
  onGenerate,
}: {
  variant: DraftVariant;
  mediaItems: FactoryMediaItem[];
  selectedChannels: ContentChannel[];
  guidelines: ContentFactoryGuidelines | null;
  isGeneratingImage: boolean;
  onOpenSourcePicker: () => void;
  onRemoveSource: (mediaId: string) => void;
  onSetPrimarySource: (mediaId: string) => void;
  onGenerate: (mode: ImageGenerationMode, prompt: string) => Promise<void>;
}) => {
  const [mode, setMode] = useState<ImageGenerationMode>("edit");
  const [prompt, setPrompt] = useState("");
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const sourceImages = getDraftVariantSourceImageIds(variant)
    .map((id) => mediaItems.find((item) => item.id === id))
    .filter((item): item is FactoryMediaItem => Boolean(item));
  const selectedSource = sourceImages.find(
    (image) => image.id === variant.imageId,
  );
  const canGenerate =
    selectedChannels.length > 0 &&
    variant.text.trim().length > 0 &&
    (mode === "generate" || Boolean(selectedSource)) &&
    !isGeneratingImage;

  return (
    <section className="mt-6 border-t border-line pt-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="text-sm font-semibold text-page-foreground">
            Исходные материалы
          </span>
          <p className="mt-1 text-xs leading-5 text-muted-ui-foreground">
            Оригиналы хранятся отдельно. Сгенерированные изображения появятся в
            медиатеке и галереях выбранных каналов.
          </p>
        </div>
        <span className="rounded-full bg-muted-ui/50 px-2.5 py-1 text-[11px] font-medium text-muted-ui-foreground">
          {sourceImages.length} фото
        </span>
      </div>

      {sourceImages.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {sourceImages.map((image) => {
            const isPrimary = mode === "edit" && image.id === variant.imageId;
            return (
              <article
                className={`overflow-hidden rounded-2xl border bg-brand-foreground transition ${
                  isPrimary
                    ? "border-brand ring-2 ring-brand/15"
                    : "border-line"
                }`}
                key={image.id}
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-muted-ui/50">
                  <button
                    aria-label={`Выбрать фото для редактирования: ${image.title}`}
                    aria-pressed={isPrimary}
                    className="size-full"
                    disabled={isGeneratingImage}
                    onClick={() => {
                      onSetPrimarySource(image.id);
                      setMode("edit");
                    }}
                    type="button"
                  >
                    <img
                      alt={image.title}
                      className="size-full object-cover"
                      src={resolveMediaUrl(image.image)}
                    />
                    <span className="absolute top-2 left-2 rounded-full bg-brand-foreground/90 px-2 py-1 text-[10px] font-semibold text-page-foreground shadow-sm">
                      {isPrimary
                        ? "Выбрано для редактирования"
                        : image.category}
                    </span>
                    {isGeneratingImage && isPrimary && (
                      <div
                        aria-label="Идёт генерация изображения"
                        aria-live="polite"
                        className="absolute inset-0 z-10 grid place-items-center bg-page-foreground/45 p-4 backdrop-blur-[2px]"
                        role="status"
                      >
                        <div className="flex flex-col items-center gap-2 rounded-2xl border border-white/40 bg-brand-foreground/95 px-5 py-4 text-center shadow-xl">
                          <span className="relative grid size-10 place-items-center">
                            <span className="absolute inset-0 animate-spin rounded-full border-2 border-brand/20 border-t-brand" />
                            <Sparkles className="size-4 animate-pulse text-brand" />
                          </span>
                          <span className="text-xs font-semibold text-page-foreground">
                            Готовим изображение…
                          </span>
                        </div>
                      </div>
                    )}
                  </button>
                  <button
                    aria-label={`Убрать ${image.title} из исходных материалов`}
                    className="absolute top-2 right-2 grid size-8 place-items-center rounded-lg bg-brand-foreground/95 text-page-foreground shadow-sm transition hover:text-red-600"
                    disabled={isGeneratingImage}
                    onClick={() => onRemoveSource(image.id)}
                    type="button"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="p-3">
                  <p className="truncate text-xs font-semibold text-page-foreground">
                    {image.title}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-line bg-page/60 px-4 py-5 text-center text-sm text-muted-ui-foreground">
          Пока нет фото. Нажмите «Добавить», чтобы выбрать снимок из галереи или
          начать генерацию с нуля.
        </p>
      )}

      <div className="relative mt-3">
        <QuietButton
          aria-expanded={isAddMenuOpen}
          disabled={isGeneratingImage}
          onClick={() => setIsAddMenuOpen((open) => !open)}
        >
          <ImagePlus className="size-3.5" /> Добавить
          <ChevronDown className="size-3.5" />
        </QuietButton>
        {isAddMenuOpen && (
          <div className="mt-2 grid max-w-xl gap-2 rounded-xl border border-line bg-brand-foreground p-2 shadow-lg sm:grid-cols-2">
            <button
              className="rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-page-foreground transition hover:bg-page"
              onClick={() => {
                setMode("edit");
                setIsAddMenuOpen(false);
                onOpenSourcePicker();
              }}
              type="button"
            >
              Редактировать из галереи
            </button>
            <button
              className="rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-page-foreground transition hover:bg-page"
              onClick={() => {
                setMode("generate");
                setIsAddMenuOpen(false);
              }}
              type="button"
            >
              Сгенерировать с нуля
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 space-y-3 rounded-2xl border border-line bg-page/70 p-3.5">
        <div>
          <p className="text-sm font-semibold text-page-foreground">
            Что сделать с изображением
          </p>
          <p className="mt-1 text-xs text-muted-ui-foreground">
            {mode === "edit"
              ? `Редактировать выбранное фото: ${selectedSource?.title ?? "выберите фото выше"}`
              : "Создать новое изображение с нуля"}
          </p>
        </div>

        <div>
          <p className="mb-1.5 text-sm font-semibold text-page-foreground">
            Форматы для выбранных каналов
          </p>
          {selectedChannels.length ? (
            <div className="flex flex-wrap gap-2">
              {selectedChannels.map((channelId) => {
                const channel = guidelines?.channels.find(
                  (item) => item.id === channelId,
                );
                return (
                  <span
                    className="rounded-full border border-line bg-brand-foreground px-2.5 py-1 text-xs text-page-foreground"
                    key={channelId}
                  >
                    {channel?.label ?? channelId}
                    {channel ? ` · ${channel.image.ratio}` : ""}
                  </span>
                );
              })}
            </div>
          ) : (
            <p className="text-xs leading-5 text-muted-ui-foreground">
              Сначала отметьте площадки в блоке «Задача».
            </p>
          )}
        </div>

        <label
          className="block text-sm font-semibold text-page-foreground"
          htmlFor="factory-image-prompt"
        >
          Инструкция для изображений
          <textarea
            className="mt-1.5 min-h-24 w-full resize-y rounded-xl border border-line bg-brand-foreground px-3 py-2.5 text-sm leading-5 text-page-foreground outline-none placeholder:text-muted-ui-foreground/80 focus:border-focus/40 focus:ring-4 focus:ring-focus/10"
            disabled={isGeneratingImage}
            id="factory-image-prompt"
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Например: сделай свет теплее, сохрани интерьер и добавь мягкий утренний свет…"
            value={prompt}
          />
        </label>

        <p className="text-xs leading-5 text-muted-ui-foreground">
          {mode === "edit"
            ? "AI изменит только выбранное фото. Оригинал останется нетронутым."
            : "AI создаст новое изображение по тексту публикации и вашей инструкции."}{" "}
          Каждое нажатие создаёт ещё один результат; все варианты сохраняются в
          медиатеке и галереях каналов. Публикации не отправляются.
        </p>

        <Button
          aria-busy={isGeneratingImage}
          className="w-full"
          disabled={!canGenerate}
          onClick={() => void onGenerate(mode, prompt.trim())}
          type="button"
        >
          <Sparkles className="size-4" />
          {isGeneratingImage
            ? "Создаём изображение…"
            : mode === "edit"
              ? "Создать вариант выбранного фото"
              : "Создать изображение с нуля"}
        </Button>
      </div>
    </section>
  );
};
