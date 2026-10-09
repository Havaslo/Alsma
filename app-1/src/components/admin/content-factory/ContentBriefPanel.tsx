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
    description: "Медиатека, затем AI",
  },
  {
    id: "library",
    label: "Медиатека",
    description: "Только существующие фото",
  },
  {
    id: "generate",
    label: "Создать новые",
    description: "Только AI-изображения",
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

const fieldClassName =
  "mt-1.5 w-full rounded-xl border border-line bg-brand-foreground px-3.5 py-2.5 text-sm leading-5 text-page-foreground outline-none placeholder:text-muted-ui-foreground/75 focus:border-focus/40 focus:ring-4 focus:ring-focus/10";

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
  ) => (
    <label
      className="block text-sm font-medium text-page-foreground"
      key={field}
    >
      {label}
      {multiline ? (
        <textarea
          className={`${fieldClassName} min-h-20 resize-y`}
          onChange={(event) => onBriefChange(field, event.target.value)}
          placeholder={placeholder}
          value={brief[field]}
        />
      ) : (
        <input
          className={`${fieldClassName} min-h-10`}
          onChange={(event) => onBriefChange(field, event.target.value)}
          placeholder={placeholder}
          value={brief[field]}
        />
      )}
    </label>
  );

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
              : "border-line bg-brand-foreground text-muted-ui-foreground hover:bg-page",
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
    <section className="rounded-3xl border border-line bg-brand-foreground p-4 shadow-[0_8px_30px_rgba(25,45,34,0.045)] sm:p-6 lg:p-7">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.13em] text-brand uppercase">
            Шаг 1 · Задача
          </p>
          <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-page-foreground sm:text-2xl">
            Опишите публикацию
          </h2>
          <p className="mt-1 text-sm text-muted-ui-foreground">
            Выберите каналы и количество изображений. Исходное фото не
            требуется.
          </p>
        </div>
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-brand/5 text-brand">
          <Sparkles className="size-5" />
        </span>
      </header>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(330px,0.8fr)] xl:gap-7">
        <div className="min-w-0 space-y-5">
          <div>
            <label
              className="mb-2 block text-sm font-semibold text-page-foreground"
              htmlFor="factory-prompt"
            >
              О чём должен быть пост?
            </label>
            <textarea
              className="min-h-32 w-full resize-y rounded-2xl border border-line bg-page/50 px-4 py-3.5 text-sm leading-6 text-page-foreground transition outline-none placeholder:text-muted-ui-foreground/80 focus:border-focus/40 focus:bg-brand-foreground focus:ring-4 focus:ring-focus/10"
              id="factory-prompt"
              onChange={(event) => onPromptChange(event.target.value)}
              placeholder="Например: расскажи о спокойном отдыхе в загородном отеле и пригласи выбрать даты на сайте"
              value={prompt}
            />
            <p className="mt-1.5 text-xs text-muted-ui-foreground">
              Начните с темы и главной мысли; точные условия можно добавить
              ниже.
            </p>
          </div>

          <fieldset>
            <legend className="mb-2 flex w-full items-center justify-between gap-2 text-sm font-semibold text-page-foreground">
              <span>Где опубликовать?</span>
              <span className="text-xs text-muted-ui-foreground">
                {selectedChannels.length} выбрано
              </span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {CONTENT_CHANNELS.map((channel) => {
                const selected = selectedChannels.includes(channel.id);
                return (
                  <button
                    aria-pressed={selected}
                    className={cn(
                      "inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition",
                      selected
                        ? "border-brand bg-brand/5 text-brand"
                        : "border-line bg-brand-foreground text-muted-ui-foreground hover:bg-page",
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
                          : "border-slate-300",
                      )}
                    >
                      {selected && <Check className="size-3" />}
                    </span>
                    {channel.label}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>

        <aside className="min-w-0 rounded-2xl border border-line bg-page/45 p-4 sm:p-5">
          <fieldset>
            <legend className="text-sm font-semibold text-page-foreground">
              Сколько изображений?
            </legend>
            <p className="mt-1 text-xs leading-5 text-muted-ui-foreground">
              Отдельные изображения, не количество каналов.
            </p>
            <div className="mt-3 grid grid-cols-5 gap-2">
              {[0, 1, 2, 3, 4].map((count) => (
                <button
                  aria-label={
                    count === 0
                      ? "Без изображений"
                      : count === 1
                        ? "1 изображение"
                        : `${count} изображения`
                  }
                  aria-pressed={imageCount === count}
                  className={cn(
                    "min-h-10 rounded-xl border text-sm font-semibold transition",
                    imageCount === count
                      ? "border-brand bg-brand text-white"
                      : "border-line bg-brand-foreground text-muted-ui-foreground hover:bg-page",
                  )}
                  key={count}
                  onClick={() => onImageCountChange(count)}
                  type="button"
                >
                  {count}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-ui-foreground">
              0 — только текст. Для остальных значений агент подготовит
              кадрирования под каналы.
            </p>
          </fieldset>

          {imageCount > 0 && (
            <fieldset className="mt-5 border-t border-line pt-4">
              <legend className="text-sm font-semibold text-page-foreground">
                Источник изображений
              </legend>
              <div className="mt-2 space-y-2">
                {sourceModes.map((option) => {
                  const selected = imageSourceMode === option.id;
                  return (
                    <button
                      aria-pressed={selected}
                      className={cn(
                        "flex min-h-12 w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition",
                        selected
                          ? "border-brand/40 bg-brand/5"
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
                      <span className="min-w-0">
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
                  AI создаст только недостающие изображения; генерация расходует
                  квоту.
                </p>
              )}
            </fieldset>
          )}
        </aside>
      </div>

      <div className="mt-5 border-t border-line pt-4">
        <button
          aria-controls="factory-advanced-brief"
          aria-expanded={showMore}
          className="flex min-h-10 w-full items-center justify-between gap-3 text-left text-sm font-semibold text-page-foreground"
          onClick={() => setShowMore((current) => !current)}
          type="button"
        >
          <span>
            Дополнить бриф{" "}
            <span className="font-normal text-muted-ui-foreground">
              · необязательно
            </span>
          </span>
          <ChevronDown
            className={cn(
              "size-4 transition-transform",
              showMore && "rotate-180",
            )}
          />
        </button>
        {showMore && (
          <div
            className="mt-4 grid gap-x-6 gap-y-4 rounded-2xl bg-page/45 p-4 sm:p-5 lg:grid-cols-2"
            id="factory-advanced-brief"
          >
            <div className="space-y-4">
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
              {briefInput(
                "audience",
                "Аудитория",
                "Например: пары, семьи с детьми",
              )}
              {briefInput(
                "callToAction",
                "Призыв к действию",
                "Например: выбрать даты на сайте",
              )}
            </div>
            <div className="space-y-4">
              {briefInput(
                "keyFacts",
                "Подтверждённые факты и условия",
                "Укажите точные цены, сроки, ограничения или факты — агент не будет придумывать их.",
                true,
              )}
              {briefInput(
                "styleGuidance",
                "Тон и пожелания к тексту",
                "Например: спокойно, дружелюбно, без давления",
                true,
              )}
              {imageCount > 0 &&
                briefInput(
                  "imagePrompt",
                  "Пожелание к изображению",
                  "Например: утренний свет и спокойная атмосфера",
                  true,
                )}
              {imageCount > 0 &&
                briefInput(
                  "sourceImageRecommendation",
                  "Что искать в медиатеке",
                  "Например: фотографии бассейна или номера",
                )}
            </div>
          </div>
        )}
      </div>

      <footer className="mt-5 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-xs leading-5 text-muted-ui-foreground">
          Черновик можно проверить и изменить на следующем шаге. В соцсети
          ничего не публикуется автоматически.
        </p>
        <Button
          aria-busy={isGenerating}
          className="min-h-11 w-full shrink-0 rounded-xl bg-brand px-6 text-white shadow-sm hover:bg-brand/90 disabled:bg-slate-300 sm:w-auto"
          disabled={
            !prompt.trim() || selectedChannels.length === 0 || isGenerating
          }
          onClick={onGenerate}
          type="button"
        >
          <Sparkles className="size-4" />
          {isGenerating ? "Готовим текст и визуал…" : "Создать публикацию"}
        </Button>
      </footer>
    </section>
  );
};
