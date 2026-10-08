import { useState } from "react";

import { Check, ChevronDown, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import {
  CONTENT_CHANNELS,
  type ContentChannel,
} from "@/lib/content-factory/contentFactoryData";
import type {
  ContentFactoryBrief,
  ContentFactoryImageSourceMode,
} from "@/lib/content-factory/contentFactoryTypes";

const sourceModes: Array<{
  id: ContentFactoryImageSourceMode;
  label: string;
  description: string;
}> = [
  {
    id: "automatic",
    label: "Автоматически",
    description: "Медиатека, затем новые",
  },
  {
    id: "library",
    label: "Только медиатека",
    description: "Без новых AI-изображений",
  },
  {
    id: "generate",
    label: "Создать новые",
    description: "Не искать в медиатеке",
  },
];

const publicationTypes = [
  "Информационный",
  "Полезный",
  "Акция",
  "Событие",
  "Отзыв",
];
const publicationFormats = ["Пост", "Карусель", "Статья"];

export const ContentBriefPanel = ({
  prompt,
  brief,
  imageCount,
  imageSourceMode,
  selectedChannels,
  isGenerating,
  onPromptChange,
  onBriefChange,
  onImageCountChange,
  onImageSourceModeChange,
  onToggleChannel,
  onGenerate,
}: {
  prompt: string;
  brief: ContentFactoryBrief;
  imageCount: number;
  imageSourceMode: ContentFactoryImageSourceMode;
  selectedChannels: ContentChannel[];
  isGenerating: boolean;
  onPromptChange: (value: string) => void;
  onBriefChange: (field: keyof ContentFactoryBrief, value: string) => void;
  onImageCountChange: (value: number) => void;
  onImageSourceModeChange: (value: ContentFactoryImageSourceMode) => void;
  onToggleChannel: (channel: ContentChannel) => void;
  onGenerate: () => void;
}) => {
  const [showMore, setShowMore] = useState(false);
  const briefInput = (
    field: keyof ContentFactoryBrief,
    label: string,
    placeholder: string,
    multiline = false,
  ) => {
    const className =
      "mt-1.5 w-full rounded-xl border border-line bg-page/70 px-3.5 py-2.5 text-sm leading-5 outline-none placeholder:text-muted-ui-foreground/75 focus:border-focus/40 focus:bg-brand-foreground focus:ring-4 focus:ring-focus/10";
    return (
      <label
        className="block text-sm font-medium text-page-foreground"
        key={field}
      >
        {label}
        {multiline ? (
          <textarea
            className={`${className} min-h-20 resize-y`}
            onChange={(event) => onBriefChange(field, event.target.value)}
            placeholder={placeholder}
            value={brief[field]}
          />
        ) : (
          <input
            className={`${className} min-h-10`}
            onChange={(event) => onBriefChange(field, event.target.value)}
            placeholder={placeholder}
            value={brief[field]}
          />
        )}
      </label>
    );
  };

  const chips = (
    values: string[],
    current: string,
    field: "postType" | "format",
  ) => (
    <div className="flex flex-wrap gap-2">
      {values.map((value) => (
        <button
          aria-pressed={current === value}
          className={cn(
            "min-h-9 rounded-lg border px-3 text-xs font-semibold transition",
            current === value
              ? "border-brand bg-brand/5 text-brand"
              : "border-line text-muted-ui-foreground hover:bg-page",
          )}
          key={value}
          onClick={() => onBriefChange(field, current === value ? "" : value)}
          type="button"
        >
          {value}
        </button>
      ))}
    </div>
  );

  return (
    <section className="rounded-3xl border border-line bg-brand-foreground p-5 shadow-[0_8px_30px_rgba(25,45,34,0.045)] sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.13em] text-brand uppercase">
            Шаг 1 · Задача
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-page-foreground">
            Что нужно подготовить?
          </h2>
          <p className="mt-1 text-sm text-muted-ui-foreground">
            Опишите публикацию. Фото выбирать не нужно — агент займётся
            визуалом.
          </p>
        </div>
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-brand/5 text-brand">
          <Sparkles className="size-5" />
        </span>
      </div>

      <label
        className="mb-2 block text-sm font-semibold text-page-foreground"
        htmlFor="factory-prompt"
      >
        О чём должен быть пост?
      </label>
      <textarea
        className="min-h-28 w-full resize-y rounded-2xl border border-line bg-page/70 px-4 py-3.5 text-sm leading-6 text-page-foreground transition outline-none placeholder:text-muted-ui-foreground/80 focus:border-focus/40 focus:bg-brand-foreground focus:ring-4 focus:ring-focus/10"
        id="factory-prompt"
        onChange={(event) => onPromptChange(event.target.value)}
        placeholder="Например: расскажи о спокойном отдыхе в загородном отеле и пригласи выбрать даты на сайте"
        value={prompt}
      />
      <p className="mt-2 text-xs text-muted-ui-foreground">
        Можно начать с одной фразы, а детали добавить ниже
      </p>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-page-foreground">
            Каналы
          </span>
          <span className="text-xs text-muted-ui-foreground">
            {selectedChannels.length} выбрано
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {CONTENT_CHANNELS.map((channel) => {
            const selected = selectedChannels.includes(channel.id);
            return (
              <button
                aria-pressed={selected}
                className={cn(
                  "inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition",
                  selected
                    ? "border-brand bg-brand/5 text-brand shadow-sm shadow-emerald-900/5"
                    : "border-line bg-brand-foreground text-muted-ui-foreground hover:border-slate-300 hover:bg-page",
                )}
                key={channel.id}
                onClick={() => onToggleChannel(channel.id)}
                type="button"
              >
                <span
                  className={cn(
                    "grid size-4 place-items-center rounded-full border",
                    selected
                      ? "border-brand bg-brand text-white"
                      : "border-slate-300 bg-brand-foreground",
                  )}
                >
                  {selected && <Check className="size-3" />}
                </span>
                {channel.label}
              </button>
            );
          })}
        </div>
      </div>

      <fieldset className="mt-5">
        <legend className="mb-2 text-sm font-semibold text-page-foreground">
          Сколько изображений нужно?
        </legend>
        <div className="flex flex-wrap gap-2">
          {[0, 1, 2, 3, 4].map((count) => (
            <button
              aria-pressed={imageCount === count}
              className={cn(
                "min-h-10 min-w-11 rounded-xl border px-3 text-sm font-semibold transition",
                imageCount === count
                  ? "border-brand bg-brand text-white"
                  : "border-line bg-brand-foreground text-muted-ui-foreground hover:bg-page",
              )}
              key={count}
              onClick={() => onImageCountChange(count)}
              type="button"
            >
              {count === 0 ? "Без фото" : count}
            </button>
          ))}
        </div>
        {imageCount > 0 && (
          <p className="mt-2 text-xs leading-5 text-muted-ui-foreground">
            Это число отдельных изображений; для выбранных каналов агент
            подготовит подходящие кадрирования.
          </p>
        )}
      </fieldset>

      {imageCount > 0 && (
        <fieldset className="mt-5">
          <legend className="mb-2 text-sm font-semibold text-page-foreground">
            Откуда взять изображения?
          </legend>
          <div className="grid gap-2">
            {sourceModes.map((option) => {
              const selected = imageSourceMode === option.id;
              return (
                <button
                  aria-pressed={selected}
                  className={cn(
                    "flex min-h-14 items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition",
                    selected
                      ? "border-brand bg-brand/5"
                      : "border-line bg-brand-foreground hover:bg-page",
                  )}
                  key={option.id}
                  onClick={() => onImageSourceModeChange(option.id)}
                  type="button"
                >
                  <span
                    className={cn(
                      "grid size-4 shrink-0 place-items-center rounded-full border",
                      selected
                        ? "border-brand bg-brand text-white"
                        : "border-slate-300",
                    )}
                  >
                    {selected && <Check className="size-3" />}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-page-foreground">
                      {option.label}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-ui-foreground">
                      {option.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          {imageSourceMode !== "library" && (
            <p className="mt-2 text-xs leading-5 text-muted-ui-foreground">
              Создание изображений расходует квоту AI. В режиме «Автоматически»
              агент создаст только недостающие.
            </p>
          )}
        </fieldset>
      )}

      <div className="mt-5 border-t border-line pt-4">
        <button
          aria-expanded={showMore}
          className="flex min-h-10 w-full items-center justify-between gap-3 text-left text-sm font-semibold text-page-foreground"
          onClick={() => setShowMore((current) => !current)}
          type="button"
        >
          <span>Уточнить задачу</span>
          <ChevronDown
            className={cn(
              "size-4 transition-transform",
              showMore && "rotate-180",
            )}
          />
        </button>
        <p className="mt-1 text-xs text-muted-ui-foreground">
          Необязательно: детали помогут точнее подготовить текст и визуал
        </p>
        {showMore && (
          <div className="mt-4 space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium text-page-foreground">
                Тип публикации
              </p>
              {chips(publicationTypes, brief.postType, "postType")}
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-page-foreground">
                Формат
              </p>
              {chips(publicationFormats, brief.format, "format")}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {briefInput(
                "audience",
                "Для кого пост",
                "Например: пары, семьи с детьми",
              )}
              {briefInput(
                "callToAction",
                "Призыв к действию",
                "Например: выбрать даты на сайте",
              )}
            </div>
            {briefInput(
              "keyFacts",
              "Подтверждённые факты и условия",
              "Укажите точные цены, сроки, ограничения или факты. Агент не будет их придумывать.",
              true,
            )}
            {briefInput(
              "styleGuidance",
              "Тон и пожелания к тексту",
              "Например: спокойно, дружелюбно, без давления",
            )}
            {imageCount > 0 && (
              <>
                {briefInput(
                  "imagePrompt",
                  "Пожелание к изображению",
                  "Например: утренний свет и спокойная атмосфера",
                  true,
                )}
                {briefInput(
                  "sourceImageRecommendation",
                  "Какое фото искать в медиатеке",
                  "Например: фотографии бассейна или номера",
                )}
              </>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 border-t border-line pt-5">
        <Button
          aria-busy={isGenerating}
          className="min-h-12 w-full rounded-xl bg-brand text-white shadow-md shadow-emerald-900/10 hover:bg-brand/90 disabled:bg-slate-300"
          disabled={
            !prompt.trim() || selectedChannels.length === 0 || isGenerating
          }
          onClick={onGenerate}
          type="button"
        >
          <Sparkles className="size-4" />
          {isGenerating ? "Готовим текст и визуал…" : "Создать текст и визуал"}
        </Button>
        <p className="mt-3 text-center text-xs leading-5 text-muted-ui-foreground">
          Публикация не отправляется автоматически. Вы сначала проверяете и
          согласуете материал.
        </p>
      </div>
    </section>
  );
};
