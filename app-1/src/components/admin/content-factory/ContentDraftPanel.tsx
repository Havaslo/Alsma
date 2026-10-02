import { useState } from "react";

import {
  ImagePlus,
  RefreshCw,
  Scissors,
  Sparkles,
  WandSparkles,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import type { DraftVariant } from "@/lib/content-factory/contentFactoryData";
import { MEDIA_ITEMS } from "@/lib/content-factory/contentFactoryData";
import type { DraftAction } from "@/lib/content-factory/contentFactoryTypes";

import { QuietButton } from "./ContentFactoryPrimitives";

export const ContentDraftPanel = ({
  variant,
  variantIndex,
  variants,
  onVariantChange,
  onTextChange,
  onDraftAction,
  onCustomAction,
  onMediaBrowse,
  onImageGenerate,
}: {
  variant: DraftVariant;
  variantIndex: number;
  variants: DraftVariant[];
  onVariantChange: (index: number) => void;
  onTextChange: (text: string) => void;
  onDraftAction: (action: DraftAction) => void;
  onCustomAction: (command: string) => void;
  onMediaBrowse: () => void;
  onImageGenerate: () => void;
}) => {
  const [customCommand, setCustomCommand] = useState("");
  const image = MEDIA_ITEMS.find((item) => item.id === variant.imageId);

  const submitCustomCommand = () => {
    if (!customCommand.trim()) return;
    onCustomAction(customCommand.trim());
    setCustomCommand("");
  };

  return (
    <section className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-[0_8px_30px_rgba(25,45,34,0.045)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold tracking-[0.13em] text-emerald-800 uppercase">
              Шаг 02 · результат
            </p>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
              AI подготовил 3 варианта
            </span>
          </div>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">
            Исходный материал
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Выберите идею, отредактируйте текст и визуал
          </p>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">
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
                ? "bg-emerald-800 text-white shadow-sm shadow-emerald-900/15"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
            key={item.id}
            onClick={() => onVariantChange(index)}
            role="tab"
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(240px,0.92fr)]">
        <div className="min-w-0">
          <div className="mb-2 flex items-center justify-between gap-2">
            <label
              className="text-sm font-semibold text-slate-800"
              htmlFor="factory-draft-text"
            >
              Текст публикации
            </label>
            <span className="text-xs text-slate-400">Можно редактировать</span>
          </div>
          <textarea
            className="min-h-[248px] w-full resize-y rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3.5 text-sm leading-6 text-slate-800 transition outline-none focus:border-emerald-700/40 focus:bg-white focus:ring-4 focus:ring-emerald-700/10"
            id="factory-draft-text"
            onChange={(event) => onTextChange(event.target.value)}
            value={variant.text}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <QuietButton onClick={() => onDraftAction("shorter")}>
              <Scissors className="size-3.5" /> Сократить
            </QuietButton>
            <QuietButton onClick={() => onDraftAction("regenerate")}>
              <RefreshCw className="size-3.5" /> Перегенерировать
            </QuietButton>
            <QuietButton onClick={() => onDraftAction("sales")}>
              <WandSparkles className="size-3.5" /> Более продающим
            </QuietButton>
            <QuietButton onClick={() => onDraftAction("calmer")}>
              Спокойнее
            </QuietButton>
          </div>
          <div className="mt-3 flex gap-2">
            <input
              className="min-h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3.5 text-sm outline-none placeholder:text-slate-400 focus:border-emerald-700/40 focus:ring-4 focus:ring-emerald-700/10"
              onChange={(event) => setCustomCommand(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") submitCustomCommand();
              }}
              placeholder="Напишите свою команду для доработки…"
              value={customCommand}
            />
            <Button
              aria-label="Отправить команду"
              className="min-h-10 shrink-0 rounded-xl bg-slate-900 px-3.5 text-white hover:bg-slate-800"
              disabled={!customCommand.trim()}
              onClick={submitCustomCommand}
              type="button"
            >
              <Sparkles className="size-4" />
            </Button>
          </div>
        </div>

        <div className="min-w-0">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-slate-800">
              Рекомендуемый визуал
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
              Из медиатеки
            </span>
          </div>
          {image && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
              <div className="relative aspect-[4/3] overflow-hidden">
                <img
                  alt={image.title}
                  className="size-full object-cover"
                  src={image.image}
                />
                <span className="absolute top-3 left-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-sm backdrop-blur">
                  Подобрано по теме «SPA»
                </span>
                <button
                  aria-label="Заменить фотографию"
                  className="absolute right-3 bottom-3 grid size-9 place-items-center rounded-xl bg-white text-slate-700 shadow-md transition hover:bg-emerald-50 hover:text-emerald-800"
                  onClick={onMediaBrowse}
                  type="button"
                >
                  <ImagePlus className="size-4" />
                </button>
              </div>
              <div className="p-3.5">
                <p className="truncate text-sm font-semibold text-slate-800">
                  {image.title}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {image.category} · {image.dimensions}
                </p>
              </div>
            </div>
          )}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <QuietButton className="w-full" onClick={onMediaBrowse}>
              Подобрать фото
            </QuietButton>
            <QuietButton className="w-full" onClick={onImageGenerate}>
              <Sparkles className="size-3.5" /> Сгенерировать
            </QuietButton>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Визуал можно заменить отдельно для каждого канала перед
            согласованием.
          </p>
        </div>
      </div>
      <p className="mt-5 rounded-xl bg-slate-50 px-3.5 py-2.5 text-xs leading-5 text-slate-500">
        {variant.concept}
      </p>
    </section>
  );
};
