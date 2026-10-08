import { useCallback, useEffect, useState } from "react";

import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, Images } from "lucide-react";

import {
  type ContentChannel,
  type FactoryMediaItem,
  getChannelLabel,
} from "@/lib/content-factory/contentFactoryData";
import { resolveMediaUrl } from "@/lib/site/media-url";

import { ChannelImageOrderDialog } from "./ChannelImageOrderDialog";
import { ChannelBadge, QuietButton } from "./ContentFactoryPrimitives";

export const ChannelPublicationPreview = ({
  activeChannel,
  guideline,
  images,
  text,
  onMediaBrowse,
  onReorderImages,
}: {
  activeChannel: ContentChannel;
  guideline?: {
    image: { ratio: string };
  };
  images: FactoryMediaItem[];
  text: string;
  onMediaBrowse: (channel: ContentChannel) => void;
  onReorderImages: (
    channel: ContentChannel,
    imageIds: string[],
  ) => Promise<boolean>;
}) => {
  const [viewportRef, emblaApi] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const imagesKey = images.map((image) => image.id).join("|");

  const updateControls = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const initialUpdateFrame = window.requestAnimationFrame(updateControls);
    emblaApi.on("reInit", updateControls);
    emblaApi.on("select", updateControls);
    return () => {
      window.cancelAnimationFrame(initialUpdateFrame);
      emblaApi.off("reInit", updateControls);
      emblaApi.off("select", updateControls);
    };
  }, [emblaApi, updateControls]);

  useEffect(() => {
    if (!emblaApi) return;
    const frame = window.requestAnimationFrame(() => {
      emblaApi.scrollTo(0, true);
      updateControls();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeChannel, emblaApi, imagesKey, updateControls]);

  return (
    <>
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-page-foreground">
        <Images className="size-4 text-muted-ui-foreground" /> Предпросмотр
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
              Предпросмотр · {getChannelLabel(activeChannel)}
            </p>
          </div>
          <ChannelBadge channel={activeChannel} compact />
        </div>
        {images.length > 0 && (
          <div className="relative">
            <div className="overflow-hidden" ref={viewportRef}>
              <div className="flex touch-pan-y">
                {images.map((image, index) => (
                  <div
                    aria-roledescription="слайд"
                    className="min-w-0 shrink-0 grow-0 basis-full"
                    key={`${image.id}-${index}`}
                    role="group"
                  >
                    <div
                      className="relative w-full overflow-hidden bg-muted-ui"
                      style={{
                        aspectRatio:
                          guideline?.image.ratio.replace(":", " / ") ??
                          "16 / 9",
                      }}
                    >
                      <img
                        alt={`Кадр ${index + 1}: ${image.title}`}
                        className="size-full object-cover"
                        src={resolveMediaUrl(image.image)}
                      />
                      {images.length > 1 && (
                        <span className="absolute top-3 left-3 rounded-full bg-brand-foreground/95 px-2.5 py-1 text-xs font-semibold text-page-foreground shadow-sm">
                          {selectedIndex + 1} / {images.length}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {images.length > 1 && (
              <>
                <button
                  aria-label="Предыдущее изображение"
                  className="absolute top-1/2 left-3 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-line bg-brand-foreground/95 text-page-foreground shadow transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={!canScrollPrev}
                  onClick={() => emblaApi?.scrollPrev()}
                  type="button"
                >
                  <ChevronLeft className="size-5" />
                </button>
                <button
                  aria-label="Следующее изображение"
                  className="absolute top-1/2 right-3 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-line bg-brand-foreground/95 text-page-foreground shadow transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={!canScrollNext}
                  onClick={() => emblaApi?.scrollNext()}
                  type="button"
                >
                  <ChevronRight className="size-5" />
                </button>
              </>
            )}
          </div>
        )}
        {images.length > 1 && (
          <div
            aria-label="Выбор изображения"
            className="flex items-center justify-center gap-2 border-b border-line px-3 py-2.5"
            role="tablist"
          >
            {images.map((image, index) => (
              <button
                aria-label={`Показать изображение ${index + 1}: ${image.title}`}
                aria-selected={selectedIndex === index}
                className={`size-2.5 rounded-full transition ${
                  selectedIndex === index
                    ? "bg-brand"
                    : "bg-line hover:bg-brand/50"
                }`}
                key={image.id}
                onClick={() => emblaApi?.scrollTo(index)}
                role="tab"
                type="button"
              />
            ))}
          </div>
        )}
        <div className="p-4">
          <p className="line-clamp-4 text-xs leading-5 whitespace-pre-line text-page-foreground">
            {text}
          </p>
          <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-[10px] text-muted-ui-foreground/80">
            <span>Формат {guideline?.image.ratio ?? "канала"} · черновик</span>
            <span>Сейчас</span>
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <QuietButton onClick={() => onMediaBrowse(activeChannel)}>
          <Images className="size-3.5" /> Заменить визуал
        </QuietButton>
        {images.length > 1 && (
          <QuietButton onClick={() => setIsOrderDialogOpen(true)}>
            <Images className="size-3.5" /> Изменить порядок
          </QuietButton>
        )}
      </div>
      {images.length > 1 && isOrderDialogOpen && (
        <ChannelImageOrderDialog
          channelLabel={activeChannel}
          images={images}
          onClose={() => setIsOrderDialogOpen(false)}
          onSave={(imageIds) => onReorderImages(activeChannel, imageIds)}
        />
      )}
    </>
  );
};
