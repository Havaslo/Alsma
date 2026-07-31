import {
  Children,
  type ReactNode,
  useCallback,
  useEffect,
  useState,
} from "react";

import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/cn";

type HorizontalCarouselProps = {
  children: ReactNode;
  className?: string;
  controlsInside?: boolean;
  slideClassName?: string;
};

export const HorizontalCarousel = ({
  children,
  className,
  controlsInside = false,
  slideClassName,
}: HorizontalCarouselProps) => {
  const slides = Children.toArray(children);
  const [viewportRef, emblaApi] = useEmblaCarousel({
    align: "start",
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

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

  return (
    <div className={cn("relative", className)}>
      <button
        aria-label="Предыдущий слайд"
        className={cn(
          "absolute top-1/2 z-10 hidden size-12 -translate-y-1/2 place-items-center rounded-full border border-brand/25 backdrop-blur transition disabled:cursor-default disabled:opacity-35 lg:grid",
          controlsInside
            ? "left-4 bg-brand/90 text-brand-foreground hover:bg-brand"
            : "left-0 bg-panel/90 text-brand hover:bg-panel",
        )}
        disabled={!canScrollPrev}
        onClick={() => emblaApi?.scrollPrev()}
        type="button"
      >
        <ChevronLeft className="size-5" />
      </button>
      <div
        className={cn("overflow-hidden", !controlsInside && "lg:mx-16")}
        ref={viewportRef}
      >
        <div className="-mr-6 flex touch-pan-y">
          {slides.map((slide, index) => (
            <div
              className={cn(
                "min-w-0 shrink-0 grow-0 basis-full pr-6",
                slideClassName,
              )}
              key={index}
            >
              {slide}
            </div>
          ))}
        </div>
      </div>
      <button
        aria-label="Следующий слайд"
        className={cn(
          "absolute top-1/2 z-10 hidden size-12 -translate-y-1/2 place-items-center rounded-full border border-brand/25 backdrop-blur transition disabled:cursor-default disabled:opacity-35 lg:grid",
          controlsInside
            ? "right-4 bg-brand/90 text-brand-foreground hover:bg-brand"
            : "right-0 bg-panel/90 text-brand hover:bg-panel",
        )}
        disabled={!canScrollNext}
        onClick={() => emblaApi?.scrollNext()}
        type="button"
      >
        <ChevronRight className="size-5" />
      </button>
      {slides.length > 1 && (
        <div
          className={cn(
            "mt-10 flex justify-center gap-3 lg:mt-8",
            controlsInside &&
              "absolute bottom-4 left-1/2 z-10 mt-0 -translate-x-1/2",
          )}
        >
          {slides.map((_, index) => (
            <button
              aria-label={`Перейти к слайду ${index + 1}`}
              className={cn(
                "h-2.5 rounded-full bg-muted-ui transition-all",
                selectedIndex === index ? "w-10 bg-brand" : "w-2.5",
              )}
              key={index}
              onClick={() => emblaApi?.scrollTo(index)}
              type="button"
            />
          ))}
        </div>
      )}
    </div>
  );
};
