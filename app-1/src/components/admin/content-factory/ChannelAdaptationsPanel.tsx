import { useState } from "react";

import { Check, RefreshCw, Sparkles } from "lucide-react";

import { cn } from "@/lib/cn";
import {
  CONTENT_CHANNELS,
  type ContentChannel,
  type DraftVariant,
  type FactoryMediaItem,
  getDraftVariantImageIds,
} from "@/lib/content-factory/contentFactoryData";
import type { ContentFactoryGuidelines } from "@/lib/content-factory/contentFactoryTypes";

import { ChannelAdaptationRewriteDialog } from "./ChannelAdaptationRewriteDialog";
import { ChannelPublicationPreview } from "./ChannelPublicationPreview";
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
  onApplyImages,
  onReorderImages,
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
    action: "shorter" | "regenerate" | "rewrite",
    instruction?: string,
  ) => Promise<boolean>;
  onApplyImages: (
    channel: ContentChannel,
    imageIds: string[],
  ) => Promise<boolean>;
  onReorderImages: (
    channel: ContentChannel,
    imageIds: string[],
  ) => Promise<boolean>;
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

  const regenerateChannelText = async () => {
    setIsRefiningChannel(true);
    try {
      await onAdaptAction(activeChannel, "regenerate");
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
    <section className="rounded-3xl border border-line bg-brand-foreground p-4 shadow-[0_8px_30px_rgba(25,45,34,0.045)] sm:p-6 lg:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.13em] text-brand uppercase">
            Шаг 3 · Проверка
          </p>
          <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-page-foreground sm:text-2xl">
            Проверьте версии и превью
          </h2>
          <p className="mt-1 text-sm text-muted-ui-foreground">
            Переключайтесь между каналами. Правки текста влияют только на
            выбранную версию.
          </p>
        </div>
        <span className="rounded-full bg-muted-ui/50 px-3 py-1.5 text-xs font-semibold text-muted-ui-foreground">
          {selectedChannels.length} из {CONTENT_CHANNELS.length} каналов
          включено
        </span>
      </div>

      <div
        aria-label="Версии публикации по каналам"
        className="mt-4 scrollbar-none flex gap-2 overflow-x-auto pb-1"
        role="tablist"
      >
        {CONTENT_CHANNELS.map((channel) => {
          const enabled = selectedChannels.includes(channel.id);
          const chosen = activeChannel === channel.id;
          return (
            <button
              aria-selected={chosen}
              className={cn(
                "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition",
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

      <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(390px,0.9fr)] xl:gap-6">
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
            <details className="mt-3 rounded-xl border border-line bg-page/55 px-3.5 py-2.5">
              <summary className="cursor-pointer list-none text-xs font-semibold text-page-foreground marker:hidden">
                Формат {guideline.image.ratio} · {guideline.image.dimensions}
                <span className="ml-2 font-normal text-muted-ui-foreground">
                  Правила канала
                </span>
              </summary>
              <div className="mt-2 space-y-1.5 border-t border-line pt-2 text-xs leading-5 text-muted-ui-foreground">
                <p>
                  {guideline.image.format}. {guideline.image.note}
                </p>
                <p>
                  <span className="font-semibold text-page-foreground">
                    Галерея:
                  </span>{" "}
                  {guideline.gallery}
                </p>
              </div>
            </details>
          )}

          {active ? (
            <>
              <label
                className="mt-4 mb-2 block text-sm font-semibold text-page-foreground"
                htmlFor={`adaptation-${activeChannel}`}
              >
                Текст для{" "}
                {
                  CONTENT_CHANNELS.find((item) => item.id === activeChannel)
                    ?.label
                }
              </label>
              <textarea
                className="min-h-56 w-full resize-y rounded-2xl border border-line bg-page/50 px-4 py-3.5 text-sm leading-6 text-page-foreground transition outline-none focus:border-focus/40 focus:bg-brand-foreground focus:ring-4 focus:ring-focus/10 xl:min-h-[360px]"
                id={`adaptation-${activeChannel}`}
                onChange={(event) =>
                  onTextChange(activeChannel, event.target.value)
                }
                value={variant.adaptations[activeChannel]}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <QuietButton
                  disabled={isRefiningChannel}
                  onClick={() => void regenerateChannelText()}
                >
                  <Sparkles className="size-3.5" /> Перегенерировать
                </QuietButton>
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
                  <Sparkles className="size-3.5" /> Переработать по инструкции
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
          <ChannelPublicationPreview
            activeChannel={activeChannel}
            guideline={guideline}
            images={images}
            mediaItems={mediaItems}
            onApplyImages={onApplyImages}
            onReorderImages={onReorderImages}
            text={variant.adaptations[activeChannel]}
          />
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
