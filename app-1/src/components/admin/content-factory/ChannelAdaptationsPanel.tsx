import { useState } from "react";

import { Check, Eye, ImagePlus, RefreshCw, Sparkles } from "lucide-react";

import { cn } from "@/lib/cn";
import {
  CONTENT_CHANNELS,
  type ContentChannel,
  type DraftVariant,
  type FactoryMediaItem,
  getDraftVariantImageIds,
} from "@/lib/content-factory/contentFactoryData";
import type { ContentFactoryGuidelines } from "@/lib/content-factory/contentFactoryTypes";
import { resolveMediaUrl } from "@/lib/site/media-url";

import { ChannelAdaptationRewriteDialog } from "./ChannelAdaptationRewriteDialog";
import { ChannelBadge, QuietButton } from "./ContentFactoryPrimitives";

export const ChannelAdaptationsPanel = ({
  variant,
  activeChannel,
  selectedChannels,
  guidelines,
  onActiveChannelChange,
  onToggleChannel,
  onTextChange,
  onAdaptAction,
  onMediaBrowse,
  mediaItems,
}: {
  variant: DraftVariant;
  mediaItems: FactoryMediaItem[];
  activeChannel: ContentChannel;
  selectedChannels: ContentChannel[];
  guidelines: ContentFactoryGuidelines | null;
  onActiveChannelChange: (channel: ContentChannel) => void;
  onToggleChannel: (channel: ContentChannel) => void;
  onTextChange: (channel: ContentChannel, text: string) => void;
  onAdaptAction: (
    channel: ContentChannel,
    action: "shorter" | "rewrite",
    instruction?: string,
  ) => Promise<boolean>;
  onMediaBrowse: (channel: ContentChannel) => void;
}) => {
  const [rewriteTarget, setRewriteTarget] = useState<ContentChannel | null>(
    null,
  );
  const [isRefiningChannel, setIsRefiningChannel] = useState(false);
  const active = selectedChannels.includes(activeChannel);
  const guideline = guidelines?.channels.find(
    (channel) => channel.id === activeChannel,
  );
  const images = getDraftVariantImageIds(variant, activeChannel)
    .map((imageId) => mediaItems.find((item) => item.id === imageId))
    .filter((item): item is FactoryMediaItem => Boolean(item));
  const channelLabel =
    CONTENT_CHANNELS.find((item) => item.id === rewriteTarget)?.label ??
    "канала";

  const shortenChannelText = async () => {
    setIsRefiningChannel(true);
    try {
      await onAdaptAction(activeChannel, "shorter");
    } finally {
      setIsRefiningChannel(false);
    }
  };

  const rewriteChannelText = async (instruction: string) => {
    if (!rewriteTarget) return false;
    setIsRefiningChannel(true);
    try {
      return await onAdaptAction(rewriteTarget, "rewrite", instruction);
    } finally {
      setIsRefiningChannel(false);
    }
  };

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
                {guideline?.copy ?? "Отдельная версия для выбранной площадки"}
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

          {guideline && (
            <div className="mt-4 space-y-2 rounded-xl border border-line bg-page/70 p-3.5 text-xs leading-5 text-muted-ui-foreground">
              <p>
                <span className="font-semibold text-page-foreground">
                  Изображение:
                </span>{" "}
                {guideline.image.dimensions} · {guideline.image.ratio} ·{" "}
                {guideline.image.format}.
              </p>
              <p>{guideline.image.note}</p>
              <p>
                <span className="font-semibold text-page-foreground">
                  Несколько изображений:
                </span>{" "}
                {guideline.gallery}
              </p>
            </div>
          )}

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
                  disabled={isRefiningChannel}
                  onClick={() => void shortenChannelText()}
                >
                  <RefreshCw className="size-3.5" /> Сделать короче
                </QuietButton>
                <QuietButton
                  disabled={isRefiningChannel}
                  onClick={() => setRewriteTarget(activeChannel)}
                >
                  <Sparkles className="size-3.5" /> Переработать эту версию
                </QuietButton>
              </div>
              {isRefiningChannel && (
                <p
                  aria-live="polite"
                  className="mt-2 text-xs text-muted-ui-foreground"
                >
                  Агент обновляет версию только для этого канала…
                </p>
              )}
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
            {images.length > 0 && (
              <div
                className={`grid gap-2 ${images.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}
              >
                {images.map((image, index) => (
                  <div
                    className="relative w-full overflow-hidden bg-muted-ui"
                    key={`${image.id}-${index}`}
                    style={{
                      aspectRatio:
                        guideline?.image.ratio.replace(":", " / ") ?? "16 / 9",
                    }}
                  >
                    <img
                      alt={`Кадр ${index + 1}: ${image.title}`}
                      className="size-full object-cover"
                      src={resolveMediaUrl(image.image)}
                    />
                    {images.length > 1 && (
                      <span className="absolute top-2 left-2 rounded-full bg-brand-foreground/90 px-2 py-1 text-[10px] font-semibold text-page-foreground shadow-sm">
                        {index + 1} / {images.length}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="p-4">
              <p className="line-clamp-4 text-xs leading-5 whitespace-pre-line text-page-foreground">
                {variant.adaptations[activeChannel]}
              </p>
              <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-[10px] text-muted-ui-foreground/80">
                <span>
                  Формат {guideline?.image.ratio ?? "канала"} · черновик
                </span>
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
            Порядок кадров сохранён. Все выбранные изображения будут приложены к
            этой версии; формат каждого соответствует площадке.
          </p>
        </div>
      </div>
      <ChannelAdaptationRewriteDialog
        channelLabel={channelLabel}
        onClose={() => setRewriteTarget(null)}
        onSubmit={rewriteChannelText}
        open={rewriteTarget !== null}
      />
    </section>
  );
};
