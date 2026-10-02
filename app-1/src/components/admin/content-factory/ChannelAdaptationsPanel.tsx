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
    <section className="rounded-3xl border border-line bg-brand-foreground p-5 shadow-[0_8px_30px_rgba(25,45,34,0.045)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.13em] text-brand uppercase">
            Проверка
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-page-foreground">
            Адаптация по каналам
          </h2>
          <p className="mt-1 text-sm text-muted-ui-foreground">
            Это отдельные версии одного материала — проверьте каждую перед
            согласованием.
          </p>
        </div>
        <span className="rounded-full bg-muted-ui/50 px-3 py-1.5 text-xs font-semibold text-muted-ui-foreground">
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
                  ? "border-brand bg-brand text-white shadow-sm shadow-emerald-900/15"
                  : enabled
                    ? "border-line bg-brand-foreground text-page-foreground hover:bg-page"
                    : "border-dashed border-line bg-page text-muted-ui-foreground/80 hover:text-muted-ui-foreground",
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
              ? "border-line bg-brand-foreground"
              : "border-line bg-page/70",
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <ChannelBadge channel={activeChannel} />
              <span className="text-xs text-muted-ui-foreground">
                {channelGuidance[activeChannel]}
              </span>
            </div>
            <button
              aria-pressed={active}
              className={cn(
                "inline-flex min-h-9 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition",
                active
                  ? "border-brand/20 bg-brand/5 text-brand"
                  : "border-line bg-brand-foreground text-muted-ui-foreground hover:border-brand/30 hover:text-brand",
              )}
              onClick={() => onToggleChannel(activeChannel)}
              type="button"
            >
              <span
                className={cn(
                  "grid size-4 place-items-center rounded border",
                  active
                    ? "border-brand bg-brand text-white"
                    : "border-slate-300 bg-brand-foreground",
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
                className="mt-5 mb-2 block text-sm font-semibold text-page-foreground"
                htmlFor={`adaptation-${activeChannel}`}
              >
                Текст для{" "}
                {
                  CONTENT_CHANNELS.find((item) => item.id === activeChannel)
                    ?.label
                }
              </label>
              <textarea
                className="min-h-40 w-full resize-y rounded-2xl border border-line bg-page/60 px-4 py-3.5 text-sm leading-6 text-page-foreground transition outline-none focus:border-focus/40 focus:bg-brand-foreground focus:ring-4 focus:ring-focus/10"
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
            <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-brand-foreground px-4 py-5 text-center">
              <p className="text-sm font-semibold text-page-foreground">
                Канал пока не включён
              </p>
              <p className="mt-1 text-xs text-muted-ui-foreground">
                Добавьте его, чтобы подготовить отдельную версию публикации.
              </p>
            </div>
          )}
        </div>

        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-page-foreground">
            <Eye className="size-4 text-muted-ui-foreground" /> Предпросмотр
            публикации
          </div>
          <div className="mx-auto max-w-[420px] overflow-hidden rounded-2xl border border-line bg-brand-foreground shadow-sm">
            <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
              <span className="grid size-8 place-items-center rounded-full bg-brand text-[10px] font-bold text-white">
                A
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-page-foreground">
                  ALSMA · официальный канал
                </p>
                <p className="text-[10px] text-muted-ui-foreground/80">
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
              <p className="line-clamp-4 text-xs leading-5 whitespace-pre-line text-page-foreground">
                {variant.adaptations[activeChannel]}
              </p>
              <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-[10px] text-muted-ui-foreground/80">
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
          <p className="mt-3 text-center text-xs leading-5 text-muted-ui-foreground">
            Визуал будет подготовлен отдельно для формата выбранной площадки.
          </p>
        </div>
      </div>
    </section>
  );
};
