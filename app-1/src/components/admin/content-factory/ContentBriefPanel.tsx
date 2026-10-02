import { useState } from "react";

import { Check, ChevronDown, Settings2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import {
  CONTENT_CHANNELS,
  type ContentChannel,
} from "@/lib/content-factory/contentFactoryData";

import { SelectField } from "./ContentFactoryPrimitives";

export const ContentBriefPanel = ({
  prompt,
  selectedChannels,
  onPromptChange,
  onToggleChannel,
  onGenerate,
}: {
  prompt: string;
  selectedChannels: ContentChannel[];
  onPromptChange: (value: string) => void;
  onToggleChannel: (channel: ContentChannel) => void;
  onGenerate: () => void;
}) => {
  const [contentType, setContentType] = useState("Продающий");
  const [goal, setGoal] = useState("Записи на SPA");
  const [tone, setTone] = useState("Тёплый и заботливый");
  const [service, setService] = useState("SPA · ноябрьская акция");
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <section className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-[0_8px_30px_rgba(25,45,34,0.045)] sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.13em] text-emerald-800 uppercase">
            Шаг 01 · задача
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">
            Что нужно опубликовать?
          </h2>
        </div>
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-800">
          <Sparkles className="size-5" />
        </span>
      </div>

      <label
        className="mb-2 block text-sm font-semibold text-slate-700"
        htmlFor="factory-prompt"
      >
        Опишите задачу своими словами
      </label>
      <textarea
        className="min-h-32 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3.5 text-sm leading-6 text-slate-800 transition outline-none placeholder:text-slate-400 focus:border-emerald-700/40 focus:bg-white focus:ring-4 focus:ring-emerald-700/10"
        id="factory-prompt"
        onChange={(event) => onPromptChange(event.target.value)}
        placeholder="Например: сделай пост про ноябрьскую акцию на SPA со скидкой 20%"
        value={prompt}
      />
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500">
          Можно начать с одной фразы — детали добавите позже
        </p>
        <button
          aria-expanded={detailsOpen}
          className="inline-flex min-h-9 items-center gap-2 rounded-xl px-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-emerald-800"
          onClick={() => setDetailsOpen((open) => !open)}
          type="button"
        >
          <Settings2 className="size-4" /> Дополнительные настройки
          <ChevronDown
            className={cn("size-3.5 transition", detailsOpen && "rotate-180")}
          />
        </button>
      </div>

      {detailsOpen && (
        <div className="mt-4 space-y-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField
              label="Тип контента"
              onChange={setContentType}
              options={[
                "Продающий",
                "Информационный",
                "Развлекательный",
                "Атмосферный",
                "Познавательный",
              ]}
              value={contentType}
            />
            <SelectField
              label="Цель публикации"
              onChange={setGoal}
              options={[
                "Записи на SPA",
                "Охват",
                "Вовлечение",
                "Переходы на сайт",
              ]}
              value={goal}
            />
            <SelectField
              label="Услуга или акция"
              onChange={setService}
              options={[
                "SPA · ноябрьская акция",
                "Проживание",
                "Ресторан",
                "Чан",
                "Мероприятия",
              ]}
              value={service}
            />
            <SelectField
              label="Tone of Voice"
              onChange={setTone}
              options={[
                "Тёплый и заботливый",
                "Экспертный",
                "Лёгкий и дружелюбный",
                "Сдержанный",
              ]}
              value={tone}
            />
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50/70 px-3.5 py-3">
            <label
              className="block text-xs font-semibold text-amber-900"
              htmlFor="factory-period"
            >
              Период действия предложения
            </label>
            <input
              className="mt-1.5 min-h-10 w-full rounded-lg border border-amber-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
              defaultValue="1–30 ноября 2026"
              id="factory-period"
              type="text"
            />
            <p className="mt-1 text-[11px] text-amber-800">
              Демонстрационное значение — проверьте перед публикацией
            </p>
          </div>
        </div>
      )}

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-slate-700">
            Каналы публикации
          </span>
          <span className="text-xs text-slate-500">
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
                    ? "border-emerald-800 bg-emerald-50 text-emerald-900 shadow-sm shadow-emerald-900/5"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
                )}
                key={channel.id}
                onClick={() => onToggleChannel(channel.id)}
                type="button"
              >
                <span
                  className={cn(
                    "grid size-4 place-items-center rounded-full border",
                    selected
                      ? "border-emerald-700 bg-emerald-700 text-white"
                      : "border-slate-300 bg-white",
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

      <div className="mt-6 border-t border-slate-100 pt-5">
        <Button
          className="min-h-12 w-full rounded-xl bg-emerald-800 text-white shadow-md shadow-emerald-900/10 hover:bg-emerald-900 disabled:bg-slate-300"
          disabled={!prompt.trim() || selectedChannels.length === 0}
          onClick={onGenerate}
          type="button"
        >
          <Sparkles className="size-4" /> Сгенерировать варианты
        </Button>
        <p className="mt-3 text-center text-xs leading-5 text-slate-500">
          Публикация не отправляется автоматически. Вы сначала проверяете и
          согласуете материал.
        </p>
      </div>
    </section>
  );
};
