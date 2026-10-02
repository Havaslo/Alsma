import { Check, Eye, ImagePlus, RefreshCw, Sparkles } from "lucide-react";

import { cn } from "@/lib/cn";
import {
  CONTENT_CHANNELS,
  type ContentChannel,
  type DraftVariant,
  MEDIA_ITEMS,
} from "@/lib/content-factory/contentFactoryData";

import { ChannelBadge, QuietButton } from "./ContentFactoryPrimitives";

const channelGuidance: Record<ContentChannel, string> = {
  vk: "Подробная версия с контекстом и призывом к действию",
  telegram: "Компактная, живая подача для быстрого чтения",
  max: "Короткий самостоятельный текст без лишних деталей",
  instagram: "Визуальный акцент, короткая подпись и хэштеги",
  zen: "Развёрнутый информационный формат",
};

export const ChannelAdaptationsPanel = ({
  variant,
  activeChannel,
  selectedChannels,
  onActiveChannelChange,
  onToggleChannel,
  onTextChange,
  onAdaptAction,
  onMediaBrowse,
}: {
  variant: DraftVariant;
  activeChannel: ContentChannel;
  selectedChannels: ContentChannel[];
  onActiveChannelChange: (channel: ContentChannel) => void;
  onToggleChannel: (channel: ContentChannel) => void;
  onTextChange: (channel: ContentChannel, text: string) => void;
  onAdaptAction: (
    channel: ContentChannel,
    action: "shorter" | "rewrite",
  ) => void;
  onMediaBrowse: (channel: ContentChannel) => void;
}) => {
  const active = selectedChannels.includes(activeChannel);
  const image =
    MEDIA_ITEMS.find(
      (item) => item.id === variant.channelImageIds[activeChannel],
    ) ?? MEDIA_ITEMS.find((item) => item.id === variant.imageId);

  return (
    <section className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-[0_8px_30px_rgba(25,45,34,0.045)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.13em] text-emerald-800 uppercase">
            Шаг 03 · проверка
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">
            Адаптация по каналам
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Это отдельные версии одного материала — проверьте каждую перед
            согласованием.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
          {selectedChannels.length} из {CONTENT_CHANNELS.length} каналов
          включено
        </span>
      </div>

      <div
        aria-label="Версии публикации по каналам"
        className="mt-5 scrollbar-none flex gap-2 overflow-x-auto pb-1"
        role="tablist"
      >
        {CONTENT_CHANNELS.map((channel) => {
          const enabled = selectedChannels.includes(channel.id);
          const chosen = activeChannel === channel.id;
          return (
            <button
              aria-selected={chosen}
              className={cn(
                "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border px-3.5 text-sm font-semibold transition",
                chosen
                  ? "border-emerald-800 bg-emerald-800 text-white shadow-sm shadow-emerald-900/15"
                  : enabled
                    ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    : "border-dashed border-slate-200 bg-slate-50 text-slate-400 hover:text-slate-600",
              )}
              key={channel.id}
              onClick={() => onActiveChannelChange(channel.id)}
              role="tab"
              type="button"
            >
              {channel.label}
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  enabled ? "bg-emerald-400" : "bg-slate-300",
                )}
              />
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(290px,0.85fr)]">
        <div
          className={cn(
            "min-w-0 rounded-2xl border p-4 sm:p-5",
            active
              ? "border-slate-200 bg-white"
              : "border-slate-200 bg-slate-50/70",
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <ChannelBadge channel={activeChannel} />
              <span className="text-xs text-slate-500">
                {channelGuidance[activeChannel]}
              </span>
            </div>
            <button
              aria-pressed={active}
              className={cn(
                "inline-flex min-h-9 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition",
                active
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-800",
              )}
              onClick={() => onToggleChannel(activeChannel)}
              type="button"
            >
              <span
                className={cn(
                  "grid size-4 place-items-center rounded border",
                  active
                    ? "border-emerald-700 bg-emerald-700 text-white"
                    : "border-slate-300 bg-white",
                )}
              >
                {active && <Check className="size-3" />}
              </span>
              {active ? "Канал включён" : "Добавить канал"}
            </button>
          </div>

          {active ? (
            <>
              <label
                className="mt-5 mb-2 block text-sm font-semibold text-slate-800"
                htmlFor={`adaptation-${activeChannel}`}
              >
                Текст для{" "}
                {
                  CONTENT_CHANNELS.find((item) => item.id === activeChannel)
                    ?.label
                }
              </label>
              <textarea
                className="min-h-40 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3.5 text-sm leading-6 text-slate-800 transition outline-none focus:border-emerald-700/40 focus:bg-white focus:ring-4 focus:ring-emerald-700/10"
                id={`adaptation-${activeChannel}`}
                onChange={(event) =>
                  onTextChange(activeChannel, event.target.value)
                }
                value={variant.adaptations[activeChannel]}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <QuietButton
                  onClick={() => onAdaptAction(activeChannel, "shorter")}
                >
                  <RefreshCw className="size-3.5" /> Сделать короче
                </QuietButton>
                <QuietButton
                  onClick={() => onAdaptAction(activeChannel, "rewrite")}
                >
                  <Sparkles className="size-3.5" /> Переработать эту версию
                </QuietButton>
              </div>
            </>
          ) : (
            <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-5 text-center">
              <p className="text-sm font-semibold text-slate-700">
                Канал пока не включён
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Добавьте его, чтобы подготовить отдельную версию публикации.
              </p>
            </div>
          )}
        </div>

        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Eye className="size-4 text-slate-500" /> Предпросмотр публикации
          </div>
          <div className="mx-auto max-w-[420px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2.5 border-b border-slate-100 px-4 py-3">
              <span className="grid size-8 place-items-center rounded-full bg-emerald-900 text-[10px] font-bold text-white">
                A
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-800">
                  ALSMA · официальный канал
                </p>
                <p className="text-[10px] text-slate-400">
                  Предпросмотр ·{" "}
                  {
                    CONTENT_CHANNELS.find((item) => item.id === activeChannel)
                      ?.label
                  }
                </p>
              </div>
              <ChannelBadge channel={activeChannel} compact />
            </div>
            {image && (
              <img
                alt={image.title}
                className="aspect-[16/9] w-full object-cover"
                src={image.image}
              />
            )}
            <div className="p-4">
              <p className="line-clamp-4 text-xs leading-5 whitespace-pre-line text-slate-700">
                {variant.adaptations[activeChannel]}
              </p>
              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-[10px] text-slate-400">
                <span>Изображение адаптировано под формат</span>
                <span>Сейчас</span>
              </div>
            </div>
          </div>
          <QuietButton
            className="mx-auto mt-3 flex"
            onClick={() => onMediaBrowse(activeChannel)}
          >
            <ImagePlus className="size-3.5" /> Заменить визуал для этого канала
          </QuietButton>
          <p className="mt-3 text-center text-xs leading-5 text-slate-500">
            Визуал будет подготовлен отдельно для формата выбранной площадки.
          </p>
        </div>
      </div>
    </section>
  );
};
