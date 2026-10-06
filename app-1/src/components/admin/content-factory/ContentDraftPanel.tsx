import { useState } from "react";

import {
  ImagePlus,
  RefreshCw,
  Scissors,
  Sparkles,
  WandSparkles,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import {
  CONTENT_CHANNELS,
  type ContentChannel,
  type DraftVariant,
  type FactoryMediaItem,
} from "@/lib/content-factory/contentFactoryData";
import type {
  ContentFactoryGuidelines,
  DraftAction,
} from "@/lib/content-factory/contentFactoryTypes";
import { resolveMediaUrl } from "@/lib/site/media-url";

import { QuietButton } from "./ContentFactoryPrimitives";

export const ContentDraftPanel = ({
  variant,
  variantIndex,
  variants,
  mediaItems,
  selectedChannels,
  guidelines,
  onVariantChange,
  onTextChange,
  onDraftAction,
  onCustomAction,
  onMediaBrowse,
  onImageGenerate,
  isGeneratingImage,
  isRefiningText,
}: {
  variant: DraftVariant;
  variantIndex: number;
  variants: DraftVariant[];
  mediaItems: FactoryMediaItem[];
  selectedChannels: ContentChannel[];
  guidelines: ContentFactoryGuidelines | null;
  onVariantChange: (index: number) => void;
  onTextChange: (text: string) => void;
  onDraftAction: (action: DraftAction) => Promise<boolean>;
  onCustomAction: (command: string) => Promise<boolean>;
  onMediaBrowse: () => void;
  onImageGenerate: (prompt: string) => Promise<void>;
  isGeneratingImage: boolean;
  isRefiningText: boolean;
}) => {
  const [customCommand, setCustomCommand] = useState("");
  const [imagePrompt, setImagePrompt] = useState("");
  const [imagePromptOpen, setImagePromptOpen] = useState(false);
  const image = mediaItems.find((item) => item.id === variant.imageId);

  const submitCustomCommand = () => {
    if (!customCommand.trim()) return;
    void onCustomAction(customCommand.trim()).then((applied) => {
      if (applied) setCustomCommand("");
    });
  };

  return (
    <section className="rounded-3xl border border-line bg-brand-foreground p-5 shadow-[0_8px_30px_rgba(25,45,34,0.045)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold tracking-[0.13em] text-brand uppercase">
              Результат
            </p>
            <span className="rounded-full bg-brand/5 px-2.5 py-1 text-[11px] font-semibold text-brand">
              AI подготовил 3 варианта
            </span>
          </div>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-page-foreground">
            Исходный материал
          </h2>
          <p className="mt-1 text-sm text-muted-ui-foreground">
            Выберите идею, отредактируйте текст и визуал
          </p>
        </div>
        <span className="rounded-full border border-line bg-page px-3 py-1.5 text-xs font-medium text-muted-ui-foreground">
          Черновик · не опубликован
        </span>
      </div>

      <div
        className="mt-5 scrollbar-none flex gap-2 overflow-x-auto pb-1"
        role="tablist"
        aria-label="Варианты публикации"
      >
        {variants.map((item, index) => (
          <button
            aria-selected={variantIndex === index}
            className={`min-h-10 shrink-0 rounded-xl px-4 text-sm font-semibold transition ${
              variantIndex === index
                ? "bg-brand text-white shadow-sm shadow-emerald-900/15"
                : "border border-line bg-brand-foreground text-muted-ui-foreground hover:bg-page"
            }`}
            key={item.id}
            onClick={() => onVariantChange(index)}
            disabled={isRefiningText}
            role="tab"
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-5 min-w-0">
        <div className="mb-2 flex items-center justify-between gap-2">
          <label
            className="text-sm font-semibold text-page-foreground"
            htmlFor="factory-draft-text"
          >
            Текст публикации
          </label>
          <span className="text-xs text-muted-ui-foreground/80">
            Можно редактировать
          </span>
        </div>
        <textarea
          className="min-h-[248px] w-full resize-y rounded-2xl border border-line bg-page/60 px-4 py-3.5 text-sm leading-6 text-page-foreground transition outline-none focus:border-focus/40 focus:bg-brand-foreground focus:ring-4 focus:ring-focus/10 disabled:cursor-wait disabled:opacity-70"
          disabled={isRefiningText}
          id="factory-draft-text"
          onChange={(event) => onTextChange(event.target.value)}
          value={variant.text}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <QuietButton
            disabled={isRefiningText}
            onClick={() => void onDraftAction("shorter")}
          >
            <Scissors className="size-3.5" /> Сократить
          </QuietButton>
          <QuietButton
            disabled={isRefiningText}
            onClick={() => void onDraftAction("regenerate")}
          >
            <RefreshCw className="size-3.5" /> Перегенерировать
          </QuietButton>
          <QuietButton
            disabled={isRefiningText}
            onClick={() => void onDraftAction("sales")}
          >
            <WandSparkles className="size-3.5" /> Более продающим
          </QuietButton>
          <QuietButton
            disabled={isRefiningText}
            onClick={() => void onDraftAction("calmer")}
          >
            Спокойнее
          </QuietButton>
        </div>
        <div className="mt-3 flex gap-2">
          <label className="sr-only" htmlFor="factory-text-refinement-command">
            Своя инструкция для переработки текста публикации
          </label>
          <input
            className="min-h-10 min-w-0 flex-1 rounded-xl border border-line bg-brand-foreground px-3.5 text-sm outline-none placeholder:text-muted-ui-foreground/80 focus:border-focus/40 focus:ring-4 focus:ring-focus/10 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isRefiningText}
            id="factory-text-refinement-command"
            onChange={(event) => setCustomCommand(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                submitCustomCommand();
              }
            }}
            placeholder="Например: добавь призыв, сохрани спокойный тон…"
            value={customCommand}
          />
          <Button
            aria-label="Отправить команду"
            aria-busy={isRefiningText}
            className="min-h-10 shrink-0 rounded-xl bg-slate-900 px-3.5 text-white hover:bg-slate-800"
            disabled={!customCommand.trim() || isRefiningText}
            onClick={submitCustomCommand}
            type="button"
          >
            <Sparkles className="size-4" />
          </Button>
        </div>
        {isRefiningText && (
          <p
            aria-live="polite"
            className="mt-2 text-xs text-muted-ui-foreground"
          >
            Перерабатываем текст по заданию, фото и выбранным каналам…
          </p>
        )}
      </div>

      <div className="mt-6 border-t border-line pt-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-semibold text-page-foreground">
            Рекомендуемый визуал
          </span>
          <span className="rounded-full bg-muted-ui/50 px-2.5 py-1 text-[11px] font-medium text-muted-ui-foreground">
            Из медиатеки
          </span>
        </div>
        <div className="grid items-center gap-4 sm:grid-cols-[minmax(190px,280px)_minmax(180px,1fr)]">
          {image && (
            <div className="overflow-hidden rounded-2xl border border-line bg-muted-ui/50">
              <div className="relative aspect-[4/3] overflow-hidden">
                <img
                  alt={image.title}
                  className="size-full object-cover"
                  src={resolveMediaUrl(image.image)}
                />
                <span className="absolute top-3 left-3 rounded-full bg-brand-foreground/90 px-2.5 py-1 text-[11px] font-semibold text-page-foreground shadow-sm backdrop-blur">
                  Источник: {image.category}
                </span>
                <button
                  aria-label="Заменить фотографию"
                  className="absolute right-3 bottom-3 grid size-9 place-items-center rounded-xl bg-brand-foreground text-page-foreground shadow-md transition hover:bg-brand/5 hover:text-brand"
                  onClick={onMediaBrowse}
                  type="button"
                >
                  <ImagePlus className="size-4" />
                </button>
              </div>
              <div className="p-3.5">
                <p className="truncate text-sm font-semibold text-page-foreground">
                  {image.title}
                </p>
                <p className="mt-1 text-xs text-muted-ui-foreground">
                  {image.category} · {image.subtitle}
                </p>
              </div>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-start">
            <QuietButton className="w-full sm:w-auto" onClick={onMediaBrowse}>
              Подобрать фото
            </QuietButton>
            <QuietButton
              aria-controls="factory-image-prompt-form"
              aria-expanded={imagePromptOpen}
              className="w-full sm:w-auto"
              onClick={() => setImagePromptOpen((open) => !open)}
            >
              <Sparkles className="size-3.5" />
              {imagePromptOpen ? "Скрыть промт" : "Сгенерировать"}
            </QuietButton>
          </div>
        </div>
        {imagePromptOpen && (
          <form
            className="mt-4 space-y-3 rounded-2xl border border-line bg-page/70 p-3.5"
            id="factory-image-prompt-form"
            onSubmit={(event) => {
              event.preventDefault();
              void onImageGenerate(imagePrompt.trim());
            }}
          >
            <div>
              <p className="mb-1.5 text-sm font-semibold text-page-foreground">
                Форматы для выбранных площадок
              </p>
              {selectedChannels.length ? (
                <div className="flex flex-wrap gap-2">
                  {selectedChannels.map((channelId) => {
                    const channel = CONTENT_CHANNELS.find(
                      (item) => item.id === channelId,
                    );
                    const guideline = guidelines?.channels.find(
                      (item) => item.id === channelId,
                    );
                    return (
                      <span
                        className="rounded-full border border-line bg-brand-foreground px-2.5 py-1 text-xs text-page-foreground"
                        key={channelId}
                      >
                        {channel?.label ?? channelId}
                        {guideline ? ` · ${guideline.image.ratio}` : ""}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs leading-5 text-muted-ui-foreground">
                  Сначала отметьте площадки в блоке «Задача» — тогда для них
                  подготовятся кадры нужных пропорций.
                </p>
              )}
            </div>
            <div>
              <label
                className="mb-1.5 block text-sm font-semibold text-page-foreground"
                htmlFor="factory-image-prompt"
              >
                Дополнительный промт
              </label>
              <textarea
                className="min-h-24 w-full resize-y rounded-xl border border-line bg-brand-foreground px-3 py-2.5 text-sm leading-5 text-page-foreground outline-none placeholder:text-muted-ui-foreground/80 focus:border-focus/40 focus:ring-4 focus:ring-focus/10"
                id="factory-image-prompt"
                onChange={(event) => setImagePrompt(event.target.value)}
                placeholder="Например: мягкий утренний свет и спокойная атмосфера…"
                value={imagePrompt}
              />
            </div>
            <p className="text-xs leading-5 text-muted-ui-foreground">
              AI учтёт текст публикации, это фото и ваши пожелания. Изображение
              будет сгенерировано один раз, а затем обрезано под форматы всех
              выбранных площадок. Результаты сохранятся в медиатеке и черновике;
              публикации не отправляются.
            </p>
            <Button
              aria-busy={isGeneratingImage}
              className="w-full"
              disabled={
                !image ||
                !variant.text.trim() ||
                !selectedChannels.length ||
                isGeneratingImage
              }
              type="submit"
            >
              <Sparkles className="size-4" />
              {isGeneratingImage
                ? "Создаём изображение и форматы…"
                : "Сгенерировать изображение"}
            </Button>
          </form>
        )}
        <p className="mt-3 text-xs leading-5 text-muted-ui-foreground">
          Изображение создаётся один раз; кадрирование по каждому каналу можно
          проверить в блоке «Версии для каналов».
        </p>
      </div>
      <p className="mt-5 rounded-xl bg-page px-3.5 py-2.5 text-xs leading-5 text-muted-ui-foreground">
        {variant.concept}
      </p>
    </section>
  );
};
